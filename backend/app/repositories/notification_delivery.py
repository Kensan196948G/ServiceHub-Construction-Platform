"""通知配信ログリポジトリ（DB 操作レイヤー）

Phase 2a の書き込みパターン:
1. `create_pending` で PENDING 行を先に挿入 (事前書き込み方式)
2. 送信成功時 `mark_sent` で status=SENT + sent_at を更新
3. 送信失敗時 `mark_failed` で status=FAILED + error_detail を更新

Idempotency guard (Codex review fix):
    mark_sent / mark_failed は status=PENDING の行のみ遷移させる。
    既に SENT/FAILED の行を再度遷移させようとしても no-op で返す。
    これにより重複コール時の attempts 二重増加と terminal state の
    上書きを防ぐ。

Phase 2d 追加:
- `mark_failed()` が `failure_kind` を保存するように拡張
- `list_retryable()`: FAILED + failure_kind=transient + attempts < max でスキャン
- `mark_retry_pending()`: 再試行前に PENDING に戻す
- `list_for_admin()`: ADMIN 配信履歴 API 用ページネーション
"""

from __future__ import annotations

import re
import uuid
from datetime import datetime, timezone
from typing import Literal

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.notification_delivery import NotificationDelivery

# RFC 5321 準拠は意図せず、実用的に「addr@host.tld」パターンだけ潰す。
# SMTP エラー文字列のローカル/リモート・アドレス混入を抑える目的。
_EMAIL_RE = re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}")
# SMTP レスポンスコードに続く server-supplied detail を潰す。
# 例: "550 5.1.1 <user@ex.com>: Recipient rejected" → "550 5.1.1 [redacted]"
_SMTP_RESP_RE = re.compile(r"(\b[245]\d{2}(?:\s+[45]\.\d+\.\d+)?)(.*)$", re.MULTILINE)

MAX_RETRY_ATTEMPTS = 3


def _sanitize_error_detail(raw: str) -> str:
    """PII / server-identifying string を error_detail から除去する。

    - メールアドレスを `[redacted-email]` に置換
    - SMTP レスポンスコードは残すが server-supplied message 部は削る
    - 先頭 1000 文字でさらに cap (元の 2000 は mark_failed 側で切る)
    """
    redacted = _EMAIL_RE.sub("[redacted-email]", raw)
    redacted = _SMTP_RESP_RE.sub(r"\1 [redacted]", redacted)
    return redacted[:1000]


class NotificationDeliveryRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_pending(
        self,
        user_id: uuid.UUID,
        event_key: str,
        channel: str,
        subject: str | None,
        body_preview: str | None,
    ) -> NotificationDelivery:
        delivery = NotificationDelivery(
            user_id=user_id,
            event_key=event_key,
            channel=channel,
            status="PENDING",
            subject=subject,
            body_preview=body_preview,
            attempts=0,
        )
        self.db.add(delivery)
        await self.db.flush()
        await self.db.refresh(delivery)
        return delivery

    async def mark_sent(self, delivery: NotificationDelivery) -> NotificationDelivery:
        """PENDING → SENT 遷移。冪等性: PENDING 以外は no-op。"""
        if delivery.status != "PENDING":
            return delivery
        delivery.status = "SENT"
        delivery.sent_at = datetime.now(timezone.utc)
        delivery.attempts += 1
        delivery.error_detail = None
        delivery.failure_kind = None
        await self.db.flush()
        await self.db.refresh(delivery)
        return delivery

    async def mark_failed(
        self,
        delivery: NotificationDelivery,
        error_detail: str,
        failure_kind: Literal["transient", "permanent"] | None = None,
    ) -> NotificationDelivery:
        """PENDING → FAILED 遷移。冪等性: PENDING 以外は no-op。

        error_detail は PII サニタイズ後に保存する (§9.8 準拠)。
        failure_kind は Phase 2d リトライ判定に使用。
        """
        if delivery.status != "PENDING":
            return delivery
        delivery.status = "FAILED"
        delivery.attempts += 1
        delivery.error_detail = _sanitize_error_detail(error_detail)
        delivery.failure_kind = failure_kind
        await self.db.flush()
        await self.db.refresh(delivery)
        return delivery

    async def mark_retry_pending(
        self, delivery: NotificationDelivery
    ) -> NotificationDelivery:
        """FAILED → PENDING 遷移 (リトライ前の状態リセット)。

        FAILED 以外は no-op。attempts はそのまま保持する
        (mark_sent/mark_failed でインクリメントされる)。
        """
        if delivery.status != "FAILED":
            return delivery
        delivery.status = "PENDING"
        delivery.error_detail = None
        delivery.failure_kind = None
        await self.db.flush()
        await self.db.refresh(delivery)
        return delivery

    async def list_retryable(
        self,
        max_attempts: int = MAX_RETRY_ATTEMPTS,
    ) -> list[NotificationDelivery]:
        """FAILED + failure_kind=transient + attempts < max_attempts の行を返す。

        Phase 2d のリトライスキャナがこのメソッドを呼び出して
        再配信候補を取得する。
        """
        result = await self.db.execute(
            select(NotificationDelivery)
            .where(
                NotificationDelivery.status == "FAILED",
                NotificationDelivery.failure_kind == "transient",
                NotificationDelivery.attempts < max_attempts,
            )
            .order_by(NotificationDelivery.created_at)
        )
        return list(result.scalars().all())

    async def list_for_admin(
        self,
        *,
        offset: int = 0,
        limit: int = 20,
        status: str | None = None,
        channel: str | None = None,
        event_key: str | None = None,
        user_id: uuid.UUID | None = None,
    ) -> list[NotificationDelivery]:
        """ADMIN 配信履歴 API 用ページネーションクエリ。"""
        q = select(NotificationDelivery)
        if status:
            q = q.where(NotificationDelivery.status == status)
        if channel:
            q = q.where(NotificationDelivery.channel == channel)
        if event_key:
            q = q.where(NotificationDelivery.event_key == event_key)
        if user_id:
            q = q.where(NotificationDelivery.user_id == user_id)
        q = (
            q.order_by(NotificationDelivery.created_at.desc())
            .offset(offset)
            .limit(limit)
        )
        result = await self.db.execute(q)
        return list(result.scalars().all())

    async def count_for_admin(
        self,
        *,
        status: str | None = None,
        channel: str | None = None,
        event_key: str | None = None,
        user_id: uuid.UUID | None = None,
    ) -> int:
        """list_for_admin に対応するカウントクエリ。"""
        from sqlalchemy import func

        q = select(func.count()).select_from(NotificationDelivery)
        if status:
            q = q.where(NotificationDelivery.status == status)
        if channel:
            q = q.where(NotificationDelivery.channel == channel)
        if event_key:
            q = q.where(NotificationDelivery.event_key == event_key)
        if user_id:
            q = q.where(NotificationDelivery.user_id == user_id)
        result = await self.db.execute(q)
        return result.scalar_one()
