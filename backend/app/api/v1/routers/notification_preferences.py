"""通知設定 API ルーター（自ユーザーのみアクセス可）

GET   /api/v1/users/me/notification-preferences
PATCH /api/v1/users/me/notification-preferences
"""

from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.deps import get_current_user
from app.db.base import get_db
from app.models.user import User
from app.schemas.common import ApiResponse
from app.schemas.notification_preference import (
    NotificationPreferenceResponse,
    NotificationPreferenceUpdate,
)
from app.services.notification_preference_service import (
    NotificationPreferenceService,
)

router = APIRouter(
    prefix="/users/me/notification-preferences",
    tags=["通知設定"],
)


@router.get("", response_model=ApiResponse[NotificationPreferenceResponse])
async def get_my_notification_preferences(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    svc = NotificationPreferenceService(db)
    pref = await svc.get_or_create(current_user.id)
    return ApiResponse(data=pref)


@router.patch("", response_model=ApiResponse[NotificationPreferenceResponse])
async def update_my_notification_preferences(
    payload: NotificationPreferenceUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    svc = NotificationPreferenceService(db)
    pref = await svc.update_preferences(current_user.id, payload)
    return ApiResponse(data=pref)
