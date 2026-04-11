"""通知配信ログリポジトリ（DB 操作レイヤー）

Phase 2a の書き込みパターン:
1. `create_pending` で PENDING 行を先に挿入 (事前書き込み方式)
2. 送信成功時 `mark_sent` で status=SENT + sent_at を更新
3. 送信失敗時 `mark_failed` で status=FAILED + error_detail を更新
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.notification_delivery import NotificationDelivery


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
        delivery.status = "SENT"
        delivery.sent_at = datetime.now(timezone.utc)
        delivery.attempts += 1
        delivery.error_detail = None
        await self.db.flush()
        await self.db.refresh(delivery)
        return delivery

    async def mark_failed(
        self, delivery: NotificationDelivery, error_detail: str
    ) -> NotificationDelivery:
        delivery.status = "FAILED"
        delivery.attempts += 1
        # Truncate error detail to keep storage bounded; full stack traces
        # tend to leak PII through user data embedded in frames.
        delivery.error_detail = error_detail[:2000]
        await self.db.flush()
        await self.db.refresh(delivery)
        return delivery
