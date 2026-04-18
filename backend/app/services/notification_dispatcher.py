"""通知配信オーケストレータ (Phase 2b / Phase 4b)

設計書 §9.2 のアーキテクチャを実装する:

    dispatch(event_key, user_ids, context)
      ├─ 購読ユーザー解決 (notification_preferences 参照)
      ├─ チャンネル別事前書き込み (delivery 行を PENDING で作成)
      ├─ Sender 呼び出し (EmailSender / SlackSender)
      ├─ SSE push (sse_manager.push — Phase 4b)
      └─ mark_sent / mark_failed で status 更新

=== Transaction boundary (Phase 2b 以降) ===
NotificationDispatcher は transaction 中立である。自身では commit を呼ばず、
呼び出し側の session context がトランザクション境界を持つ:

- **本番パス**: `schedule_notification()` が BackgroundTasks に投入し、
  background task 内で `notification_session()` コンテキストが独立 session
  を管理する。これにより呼び出し側 request-scoped session を侵食しない。
- **テストパス**: 既存の pytest fixture (`db_session_with_users`) が session
  を渡し、teardown で rollback / drop_all する。

Phase 2a の自己 commit 暫定実装は削除された (PR #95 の self-commit 契約は
Phase 2b で解消済み)。

Phase 2b スコープ:
- Email + Slack チャンネル
- `schedule_notification()` / `schedule_ping()` による BackgroundTasks 統合
- 独立 session パターン確立
- ドメインイベントフック接続なし (Phase 2c)
- リトライ機構なし (Phase 2d で `failure_kind=transient` を回収予定)
"""

import logging
import uuid
from datetime import datetime, timezone
from typing import Any

from fastapi import BackgroundTasks
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings, get_settings
from app.models.notification_delivery import NotificationDelivery
from app.models.user import User
from app.repositories.notification_delivery import NotificationDeliveryRepository
from app.repositories.notification_preference import NotificationPreferenceRepository
from app.services.notification_senders import EmailSender, SlackSender
from app.services.notification_session import notification_session
from app.services.notification_templates import TemplateRenderer
from app.services.sse_manager import sse_manager

logger = logging.getLogger(__name__)


class NotificationDispatcher:
    def __init__(
        self,
        db: AsyncSession,
        *,
        email_sender: EmailSender | None = None,
        slack_sender: SlackSender | None = None,
        template_renderer: TemplateRenderer | None = None,
        settings: Settings | None = None,
    ) -> None:
        self.db = db
        self.delivery_repo = NotificationDeliveryRepository(db)
        self.pref_repo = NotificationPreferenceRepository(db)
        self.settings = settings or get_settings()
        self.email_sender = email_sender or EmailSender(self.settings)
        self.slack_sender = slack_sender or SlackSender(self.settings)
        self.renderer = template_renderer or TemplateRenderer()

    async def dispatch(
        self,
        *,
        event_key: str,
        user_ids: list[uuid.UUID],
        context: dict[str, Any],
    ) -> list[NotificationDelivery]:
        """指定ユーザーのうち購読済みの者へ通知を送信する。

        購読判定 (チャンネル別):
            prefs.email_enabled AND prefs.events[event_key]["email"] == True
            prefs.slack_enabled AND prefs.events[event_key]["slack"] == True

        Transaction boundary: 呼び出し側の session が commit/rollback を所有する。
        本クラスは commit を呼ばない。
        """
        if not user_ids:
            return []

        users = await self._load_active_users(user_ids)
        deliveries: list[NotificationDelivery] = []

        for user in users:
            pref = await self.pref_repo.get_by_user_id(user.id)
            if pref is None:
                continue

            if self._should_send(pref, event_key, "email"):
                delivery = await self._dispatch_email(
                    event_key=event_key, user=user, context=context
                )
                deliveries.append(delivery)

            if self._should_send(pref, event_key, "slack"):
                delivery = await self._dispatch_slack(
                    event_key=event_key,
                    user=user,
                    context=context,
                    webhook_url=pref.slack_webhook_url,  # type: ignore[arg-type]
                )
                deliveries.append(delivery)

            # SSE push — fire-and-forget to all connected browser tabs (Phase 4b)
            await sse_manager.push(
                user.id,
                {
                    "type": "notification",
                    "event_key": event_key,
                    "title": context.get("title", event_key),
                    "message": context.get("message", ""),
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                },
            )

        return deliveries

    async def send_ping(
        self,
        *,
        user: User,
        channels: list[str] | None = None,
        webhook_url: str | None = None,
    ) -> list[NotificationDelivery]:
        """疎通テスト送信 (POST /notifications/test エンドポイントから呼ばれる)。

        購読設定を無視して強制送信する。ユーザーが自分の設定を検証する
        ための機能なので、「設定 OFF → 届かない」動作では意図が通らない。

        channels で送信先を絞る (例: ["email"] / ["slack"] / ["email", "slack"])。
        slack チャンネル指定時は webhook_url が必須。
        """
        context = {
            "user_name": user.full_name,
            "sent_at": datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC"),
            "app_url": "https://servicehub.local",
        }
        channels = channels or ["email"]
        deliveries: list[NotificationDelivery] = []

        if "email" in channels:
            deliveries.append(
                await self._dispatch_email(event_key="ping", user=user, context=context)
            )
        if "slack" in channels and webhook_url:
            deliveries.append(
                await self._dispatch_slack(
                    event_key="ping",
                    user=user,
                    context=context,
                    webhook_url=webhook_url,
                )
            )
        return deliveries

    async def _dispatch_email(
        self,
        *,
        event_key: str,
        user: User,
        context: dict[str, Any],
    ) -> NotificationDelivery:
        rendered = self.renderer.render_email(event_key, context)
        delivery = await self.delivery_repo.create_pending(
            user_id=user.id,
            event_key=event_key,
            channel="EMAIL",
            subject=rendered.subject,
            body_preview=rendered.body_text[:500],
        )
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
                delivery,
                result.error or "unknown error",
                failure_kind=result.failure_kind,
            )
        return delivery

    async def _dispatch_slack(
        self,
        *,
        event_key: str,
        user: User,
        context: dict[str, Any],
        webhook_url: str,
    ) -> NotificationDelivery:
        rendered = self.renderer.render_slack(event_key, context)
        delivery = await self.delivery_repo.create_pending(
            user_id=user.id,
            event_key=event_key,
            channel="SLACK",
            subject=None,  # Slack は subject を持たない
            body_preview=rendered.text[:500],
        )
        result = await self.slack_sender.send(
            webhook_url=webhook_url,
            text=rendered.text,
        )
        if result.ok:
            await self.delivery_repo.mark_sent(delivery)
        else:
            await self.delivery_repo.mark_failed(
                delivery,
                result.error or "unknown error",
                failure_kind=result.failure_kind,
            )
        return delivery

    async def retry_transient_failures(self) -> list[NotificationDelivery]:
        """FAILED + failure_kind=transient の配信行を再試行する (Phase 2d)。

        - `list_retryable()` でスキャン → PENDING に戻す → 再 dispatch
        - 再試行 1 件ごとに独立トランザクションを持たせるため、呼び出し側
          が per-delivery で session を管理することを推奨する。
          ここでは self.db を共有するが flush ごとに visibility は確保される。
        - 最大試行回数は NotificationDeliveryRepository.MAX_RETRY_ATTEMPTS (3) で制御。
        """
        candidates = await self.delivery_repo.list_retryable()
        if not candidates:
            return []

        retried: list[NotificationDelivery] = []
        for delivery in candidates:
            # Reset to PENDING so mark_sent/mark_failed can transition it
            await self.delivery_repo.mark_retry_pending(delivery)

            # Load the user to re-render the template correctly
            user_result = await self.db.execute(
                select(User).where(
                    User.id == delivery.user_id,
                    User.is_active.is_(True),
                    User.deleted_at.is_(None),
                )
            )
            user = user_result.scalar_one_or_none()
            if user is None:
                # User deleted — escalate to permanent failure so it won't retry again
                await self.delivery_repo.mark_failed(
                    delivery,
                    "user not found during retry",
                    failure_kind="permanent",
                )
                continue

            # Re-dispatch using stored event_key and empty context fallback.
            # context is not stored per-delivery; retry uses a minimal placeholder
            # so the template renders with "N/A" for dynamic fields.
            context: dict[str, Any] = {}
            if delivery.channel == "EMAIL":
                await self._retry_email(delivery, user, context)
            elif delivery.channel == "SLACK":
                pref = await self.pref_repo.get_by_user_id(user.id)
                webhook_url = pref.slack_webhook_url if pref else None
                if webhook_url:
                    await self._retry_slack(delivery, user, context, webhook_url)
                else:
                    await self.delivery_repo.mark_failed(
                        delivery,
                        "no slack webhook configured",
                        failure_kind="permanent",
                    )
            retried.append(delivery)

        return retried

    async def _retry_email(
        self,
        delivery: NotificationDelivery,
        user: User,
        context: dict[str, Any],
    ) -> None:
        """既存 delivery 行を再送信 (email)。"""
        try:
            rendered = self.renderer.render_email(delivery.event_key, context)
        except Exception as exc:
            await self.delivery_repo.mark_failed(
                delivery, f"template render error: {exc}", failure_kind="permanent"
            )
            return
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
                delivery,
                result.error or "unknown error",
                failure_kind=result.failure_kind,
            )

    async def _retry_slack(
        self,
        delivery: NotificationDelivery,
        user: User,
        context: dict[str, Any],
        webhook_url: str,
    ) -> None:
        """既存 delivery 行を再送信 (slack)。"""
        try:
            rendered = self.renderer.render_slack(delivery.event_key, context)
        except Exception as exc:
            await self.delivery_repo.mark_failed(
                delivery, f"template render error: {exc}", failure_kind="permanent"
            )
            return
        result = await self.slack_sender.send(
            webhook_url=webhook_url,
            text=rendered.text,
        )
        if result.ok:
            await self.delivery_repo.mark_sent(delivery)
        else:
            await self.delivery_repo.mark_failed(
                delivery,
                result.error or "unknown error",
                failure_kind=result.failure_kind,
            )

    @staticmethod
    def _should_send(
        pref: Any, event_key: str, channel: str, webhook_url: str | None = None
    ) -> bool:
        """preferences オブジェクトに対してチャンネル別購読判定を行う。

        グローバル enable + イベント別購読 + チャンネル固有必須設定の
        すべてを満たす場合のみ True。このメソッドが唯一の判定ゲートウェイ
        として機能するため、呼び出し側が追加チェックをする必要はない。

        - email: email_enabled + events[event_key]["email"]
        - slack: slack_enabled + slack_webhook_url 設定済み + events[event_key]["slack"]

        Phase 2a の _is_subscribed からリファクタ (pref 取得と判定の責務分離)。
        """
        if channel == "email" and not pref.email_enabled:
            return False
        if channel == "slack":
            if not pref.slack_enabled:
                return False
            # webhook_url が渡されていない場合は pref から取得して確認する
            url = webhook_url if webhook_url is not None else pref.slack_webhook_url
            if not url:
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


# ── BackgroundTasks 統合ヘルパ ─────────────────────────────────────────
# これらは「呼び出し側 (router / service) が BackgroundTasks を持っている
# 場合に使う」ヘルパ関数。独立 session を使うため、呼び出し側の transaction
# を侵食しない fire-and-forget セマンティクスを提供する。


async def _run_dispatch_in_fresh_session(
    event_key: str,
    user_ids: list[uuid.UUID],
    context: dict[str, Any],
) -> None:
    """BackgroundTask 本体: ユーザーごとに独立 session を開いて dispatch する。

    ユーザー単位でトランザクションを分離することで、ユーザー N の DB エラーが
    ユーザー 1..N-1 の delivery 行をロールバックする問題を防ぐ。
    各ユーザーの失敗は独立してログに残り、残りユーザーの配信は継続される。
    """
    for user_id in user_ids:
        try:
            async with notification_session() as session:
                dispatcher = NotificationDispatcher(session)
                await dispatcher.dispatch(
                    event_key=event_key, user_ids=[user_id], context=context
                )
        except Exception:
            logger.exception(
                "notification dispatch failed for user event=%s user_id=%s",
                event_key,
                user_id,
            )


async def _run_ping_in_fresh_session(
    user_id: uuid.UUID,
    channels: list[str],
    webhook_url: str | None,
) -> None:
    try:
        async with notification_session() as session:
            result = await session.execute(select(User).where(User.id == user_id))
            user = result.scalar_one_or_none()
            if user is None:
                logger.warning("send_ping: user not found id=%s", user_id)
                return
            dispatcher = NotificationDispatcher(session)
            await dispatcher.send_ping(
                user=user, channels=channels, webhook_url=webhook_url
            )
    except Exception:
        logger.exception("notification ping failed in background task user=%s", user_id)


def schedule_notification(
    background_tasks: BackgroundTasks,
    *,
    event_key: str,
    user_ids: list[uuid.UUID],
    context: dict[str, Any],
) -> None:
    """通知配信を BackgroundTasks キューに投入する (fire-and-forget)。

    Phase 2c のドメインイベントフックから呼ばれる想定。呼び出し側 request
    の response 返却後に独立 session で dispatch が走る。
    """
    background_tasks.add_task(
        _run_dispatch_in_fresh_session, event_key, user_ids, context
    )


def schedule_ping(
    background_tasks: BackgroundTasks,
    *,
    user_id: uuid.UUID,
    channels: list[str],
    webhook_url: str | None = None,
) -> None:
    """疎通テスト送信を BackgroundTasks キューに投入 (fire-and-forget)。"""
    background_tasks.add_task(
        _run_ping_in_fresh_session, user_id, channels, webhook_url
    )
