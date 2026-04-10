"""通知設定リポジトリ（DB 操作レイヤー）"""

import uuid
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.notification_preference import NotificationPreference


class NotificationPreferenceRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_user_id(self, user_id: uuid.UUID) -> NotificationPreference | None:
        result = await self.db.execute(
            select(NotificationPreference).where(
                NotificationPreference.user_id == user_id
            )
        )
        return result.scalar_one_or_none()

    async def create(
        self,
        user_id: uuid.UUID,
        email_enabled: bool = True,
        slack_enabled: bool = False,
        slack_webhook_url: str | None = None,
        events: dict[str, Any] | None = None,
    ) -> NotificationPreference:
        pref = NotificationPreference(
            user_id=user_id,
            email_enabled=email_enabled,
            slack_enabled=slack_enabled,
            slack_webhook_url=slack_webhook_url,
            events=events or {},
        )
        self.db.add(pref)
        await self.db.flush()
        await self.db.refresh(pref)
        return pref

    async def update(
        self,
        pref: NotificationPreference,
        data: dict[str, Any],
    ) -> NotificationPreference:
        for field, value in data.items():
            setattr(pref, field, value)
        await self.db.flush()
        await self.db.refresh(pref)
        return pref
