"""通知配信オーケストレータ (Phase 2a)

設計書 §9.2 のアーキテクチャを実装する:

    dispatch(event_key, user_ids, context)
      ├─ 購読ユーザー解決 (notification_preferences 参照)
      ├─ 事前書き込み (PENDING) → commit
      ├─ EmailSender 呼び出し (外部 I/O)
      └─ mark_sent / mark_failed で status 更新 → commit

=== Transaction boundary — 例外的責務に注意 ===
通常 Service/Repository は commit を行わず、呼び出し側 (`get_db()`) が
トランザクション境界を持つ慣用 (Phase 1 の NotificationPreferenceService 等)。
しかし通知配信は「外部 I/O の前後で durable な記録を残す」必要があるため、
NotificationDispatcher は自己トランザクション境界を持つ:

    1. PENDING 行を書いて commit
       (これで「送信を試みた」痕跡が DB に残る)
    2. SMTP 送信 (外部 I/O — ここでクラッシュしても PENDING 行は残る)
    3. 結果に応じて SENT/FAILED へ update → commit

この規約からの逸脱は Codex review で指摘された durable tracking 要件
(§9.1 / §9.4) を満たすための意図的な設計。呼び出し側は「自分の transaction
が dispatch 内部で一度 commit される」ことを把握して呼び出す必要がある。
Phase 2b 以降で BackgroundTasks 統合を入れ、独立 session で実行するように
改修することで、この注意書きは不要になる予定。

Phase 2a スコープ:
- Email チャンネルのみ (Slack は Phase 2b)
- ドメインイベントフック接続なし (Phase 2c)
- リトライ機構なし (Phase 2d で failure_kind=transient を回収予定)
- 同期実行 (BackgroundTasks 統合は Phase 2b)
"""

import uuid
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings, get_settings
from app.models.notification_delivery import NotificationDelivery
from app.models.user import User
from app.repositories.notification_delivery import NotificationDeliveryRepository
from app.repositories.notification_preference import NotificationPreferenceRepository
from app.services.notification_senders import EmailSender
from app.services.notification_templates import TemplateRenderer


class NotificationDispatcher:
    def __init__(
        self,
        db: AsyncSession,
        *,
        email_sender: EmailSender | None = None,
        template_renderer: TemplateRenderer | None = None,
        settings: Settings | None = None,
    ) -> None:
        self.db = db
        self.delivery_repo = NotificationDeliveryRepository(db)
        self.pref_repo = NotificationPreferenceRepository(db)
        self.settings = settings or get_settings()
        self.email_sender = email_sender or EmailSender(self.settings)
        self.renderer = template_renderer or TemplateRenderer()

    async def dispatch(
        self,
        *,
        event_key: str,
        user_ids: list[uuid.UUID],
        context: dict[str, Any],
    ) -> list[NotificationDelivery]:
        """指定ユーザーのうち購読済みの者へ Email を送信する。

        購読判定:
            prefs.email_enabled AND prefs.events[event_key]["email"] == True
        """
        if not user_ids:
            return []

        users = await self._load_active_users(user_ids)
        deliveries: list[NotificationDelivery] = []

        for user in users:
            if not await self._is_subscribed(user.id, event_key, "email"):
                continue
            delivery = await self._dispatch_email(
                event_key=event_key, user=user, context=context
            )
            deliveries.append(delivery)

        return deliveries

    async def send_ping(self, *, user: User) -> NotificationDelivery:
        """疎通テスト送信 (Phase 2b エンドポイントから呼ばれる想定)。

        購読設定を無視して強制送信する。ユーザーが自分の設定を検証する
        ための機能なので、「設定 OFF → 届かない」動作では意図が通らない。
        """
        context = {
            "user_name": user.full_name,
            "sent_at": datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC"),
            "app_url": "https://servicehub.local",
        }
        return await self._dispatch_email(event_key="ping", user=user, context=context)

    async def _dispatch_email(
        self,
        *,
        event_key: str,
        user: User,
        context: dict[str, Any],
    ) -> NotificationDelivery:
        """Email 1 通の送信。自己トランザクション境界を持つ (class docstring 参照)。

        順序:
            1. render
            2. PENDING 行作成 + commit (durable tracking)
            3. SMTP 送信 (外部 I/O)
            4. 結果に応じて SENT/FAILED へ update + commit
        """
        rendered = self.renderer.render_email(event_key, context)
        delivery = await self.delivery_repo.create_pending(
            user_id=user.id,
            event_key=event_key,
            channel="EMAIL",
            subject=rendered.subject,
            body_preview=rendered.body_text[:500],
        )
        # Commit #1: PENDING 行を durable に残す。ここでクラッシュしても
        # 「送信を試みた」記録が残るため Phase 2d で回収可能。
        await self.db.commit()

        result = await self.email_sender.send(
            to=user.email,
            subject=rendered.subject,
            body_text=rendered.body_text,
            body_html=rendered.body_html,
        )

        if result.ok:
            await self.delivery_repo.mark_sent(delivery)
        else:
            await self.delivery_repo.mark_failed(
                delivery, result.error or "unknown error"
            )
        # Commit #2: 終了状態 (SENT/FAILED) を durable に残す。
        await self.db.commit()
        return delivery

    async def _is_subscribed(
        self, user_id: uuid.UUID, event_key: str, channel: str
    ) -> bool:
        pref = await self.pref_repo.get_by_user_id(user_id)
        if pref is None:
            return False
        if channel == "email" and not pref.email_enabled:
            return False
        if channel == "slack" and not pref.slack_enabled:
            return False
        event_prefs = pref.events.get(event_key)
        if not isinstance(event_prefs, dict):
            return False
        return bool(event_prefs.get(channel, False))

    async def _load_active_users(self, user_ids: list[uuid.UUID]) -> list[User]:
        result = await self.db.execute(
            select(User).where(
                User.id.in_(user_ids),
                User.is_active.is_(True),
                User.deleted_at.is_(None),
            )
        )
        return list(result.scalars().all())
