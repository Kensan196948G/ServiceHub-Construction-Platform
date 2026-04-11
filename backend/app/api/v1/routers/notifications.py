"""通知配信 API ルーター (Phase 2b)

POST /api/v1/notifications/test
    設定済みチャンネル (Email / Slack) へ疎通テスト通知を送信する。
    BackgroundTasks で非同期に実行されるため、レスポンス返却時点では
    配信は完了していない。実結果は notification_deliveries に記録される。
"""

from typing import Annotated

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.deps import get_current_user
from app.db.base import get_db
from app.models.user import User
from app.repositories.notification_preference import (
    NotificationPreferenceRepository,
)
from app.schemas.common import ApiResponse
from app.schemas.notification_preference import NotificationTestResponse
from app.services.notification_dispatcher import schedule_ping

router = APIRouter(
    prefix="/notifications",
    tags=["通知配信"],
)


@router.post(
    "/test",
    response_model=ApiResponse[NotificationTestResponse],
    status_code=status.HTTP_202_ACCEPTED,
)
async def post_notification_test(
    background_tasks: BackgroundTasks,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> ApiResponse[NotificationTestResponse]:
    """設定済みチャンネルへ疎通テスト通知を送信する。

    フロー:
        1. 現在ユーザーの preferences を読む (slack_webhook_url 取得のため)
        2. `email_enabled` / `slack_enabled` + webhook_url の有無を見て
           送信対象チャンネルを決定する
        3. BackgroundTasks に send_ping をスケジュール
        4. 202 Accepted を返す (配信は非同期)

    購読判定 (prefs.events[event_key]) はここでは適用しない。疎通テストは
    ユーザーが設定そのものを検証する目的なので、個別イベント購読の ON/OFF
    に関わらず強制送信する (`send_ping` の契約)。
    """
    repo = NotificationPreferenceRepository(db)
    pref = await repo.get_by_user_id(current_user.id)
    if pref is None:
        # Phase 1 の upsert-on-read 方針と整合させ、preferences 未作成でも
        # 最低限 email だけは試せるようにする (user.email は存在する)
        channels = ["email"]
        webhook_url: str | None = None
    else:
        channels = []
        if pref.email_enabled:
            channels.append("email")
        if pref.slack_enabled and pref.slack_webhook_url:
            channels.append("slack")
        webhook_url = pref.slack_webhook_url

    if not channels:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "通知チャンネルが一つも有効になっていません。"
                "設定ページで Email または Slack を有効化してください。"
            ),
        )

    schedule_ping(
        background_tasks,
        user_id=current_user.id,
        channels=channels,
        webhook_url=webhook_url,
    )

    return ApiResponse(
        data=NotificationTestResponse(
            scheduled_channels=channels,
            message=(
                f"{len(channels)} 件のチャンネルへ疎通テストをスケジュール "
                "しました。数秒以内に通知が届かない場合は設定を確認してください。"
            ),
        )
    )
