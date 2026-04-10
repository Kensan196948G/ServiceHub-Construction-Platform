"""通知設定サービス（ビジネスロジック層）

upsert-on-read の方針により、GET 時にレコードが存在しなければデフォルト値で
自動生成する。これによりフロントエンドは常にデフォルト設定を取得でき、
「レコード未作成」という 404 状態を意識しなくて済む。
"""

import uuid
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.repositories.notification_preference import (
    NotificationPreferenceRepository,
)
from app.schemas.notification_preference import (
    NotificationPreferenceResponse,
    NotificationPreferenceUpdate,
)

# デフォルト購読イベント。新規ユーザーの初期設定として使用する。
DEFAULT_EVENTS: dict[str, Any] = {
    "daily_report_submitted": {"email": True, "slack": False},
    "safety_incident_created": {"email": True, "slack": True},
    "change_request_pending_approval": {"email": True, "slack": False},
    "incident_assigned": {"email": True, "slack": False},
    "project_status_changed": {"email": False, "slack": False},
}


class NotificationPreferenceService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = NotificationPreferenceRepository(db)

    async def get_or_create(self, user_id: uuid.UUID) -> NotificationPreferenceResponse:
        """Upsert-on-read: レコードが無ければデフォルト値で作成して返す。"""
        pref = await self.repo.get_by_user_id(user_id)
        if pref is None:
            pref = await self.repo.create(
                user_id=user_id,
                events=DEFAULT_EVENTS.copy(),
            )
        return NotificationPreferenceResponse.model_validate(pref)

    async def update_preferences(
        self,
        user_id: uuid.UUID,
        data: NotificationPreferenceUpdate,
    ) -> NotificationPreferenceResponse:
        """部分更新。レコードが無い場合は先にデフォルト値で作成する。"""
        pref = await self.repo.get_by_user_id(user_id)
        if pref is None:
            pref = await self.repo.create(
                user_id=user_id,
                events=DEFAULT_EVENTS.copy(),
            )
        update_data = self._build_update_dict(data)
        if update_data:
            pref = await self.repo.update(pref, update_data)
        return NotificationPreferenceResponse.model_validate(pref)

    @staticmethod
    def _build_update_dict(
        data: NotificationPreferenceUpdate,
    ) -> dict[str, Any]:
        """Pydantic モデルから None 以外のフィールドのみを取り出す。

        HttpUrl 型は文字列に変換する必要がある。
        """
        result: dict[str, Any] = {}
        if data.email_enabled is not None:
            result["email_enabled"] = data.email_enabled
        if data.slack_enabled is not None:
            result["slack_enabled"] = data.slack_enabled
        if data.slack_webhook_url is not None:
            result["slack_webhook_url"] = str(data.slack_webhook_url)
        if data.events is not None:
            result["events"] = data.events
        return result
