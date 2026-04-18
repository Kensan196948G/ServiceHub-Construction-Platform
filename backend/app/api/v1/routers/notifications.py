"""通知配信 API ルーター

Phase 2b:
    POST /api/v1/notifications/test
        設定済みチャンネル (Email / Slack) へ疎通テスト通知を送信する。
        BackgroundTasks で非同期に実行されるため、レスポンス返却時点では
        配信は完了していない。実結果は notification_deliveries に記録される。

Phase 2d:
    GET /api/v1/notifications/deliveries
        ADMIN のみ利用可能な配信履歴 API。
        status, channel, event_key, user_id でフィルタリング可能。

Phase 2e:
    GET /api/v1/notifications/deliveries へのアクセスを audit_logs に記録。
    action='READ', resource='notification_deliveries'

Phase 2f:
    POST /api/v1/notifications/retry
        ADMIN が手動で transient 失敗通知の即時リトライを実行する。
        lifespan バックグラウンドループとは独立した同期実行。
"""

import math
import uuid
from typing import Annotated

from fastapi import (
    APIRouter,
    BackgroundTasks,
    Depends,
    HTTPException,
    Query,
    Request,
    status,
)
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.deps import get_current_user
from app.core.rbac import UserRole, require_roles
from app.db.base import get_db
from app.models.user import User
from app.repositories.audit_log import AuditLogRepository
from app.repositories.notification_delivery import NotificationDeliveryRepository
from app.repositories.notification_preference import (
    NotificationPreferenceRepository,
)
from app.schemas.common import ApiResponse, PaginatedResponse, PaginationMeta
from app.schemas.notification_delivery import NotificationDeliveryResponse
from app.schemas.notification_preference import NotificationTestResponse
from app.services.notification_dispatcher import NotificationDispatcher, schedule_ping
from app.services.sse_manager import sse_manager

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


@router.get(
    "/deliveries",
    response_model=PaginatedResponse[NotificationDeliveryResponse],
)
async def list_notification_deliveries(
    request: Request,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_roles(UserRole.ADMIN))],
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=20, ge=1, le=100),
    filter_status: str | None = Query(default=None, alias="status"),
    filter_channel: str | None = Query(default=None, alias="channel"),
    filter_event_key: str | None = Query(default=None, alias="event_key"),
    filter_user_id: uuid.UUID | None = Query(default=None, alias="user_id"),
) -> PaginatedResponse[NotificationDeliveryResponse]:
    """通知配信履歴一覧 (ADMIN 専用)。

    クエリパラメータ:
        status     - PENDING / SENT / FAILED でフィルタ
        channel    - EMAIL / SLACK でフィルタ
        event_key  - イベント種別でフィルタ
        user_id    - ユーザー ID でフィルタ
        page       - ページ番号 (1 始まり)
        per_page   - 1 ページあたり件数 (最大 100)

    このエンドポイントへのアクセスは audit_logs に記録される (Phase 2e)。
    """
    offset = (page - 1) * per_page
    repo = NotificationDeliveryRepository(db)

    deliveries, total = await _query_deliveries(
        repo,
        offset=offset,
        limit=per_page,
        status=filter_status,
        channel=filter_channel,
        event_key=filter_event_key,
        user_id=filter_user_id,
    )

    # ADMIN アクセスを audit_logs に記録 (ISO27001 §9.8)
    await AuditLogRepository(db).create(
        action="READ",
        resource="notification_deliveries",
        user_id=current_user.id,
        after_data={
            "page": page,
            "per_page": per_page,
            "filter_status": filter_status,
            "filter_channel": filter_channel,
            "filter_event_key": filter_event_key,
            "filter_user_id": str(filter_user_id) if filter_user_id else None,
            "total_returned": total,
        },
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
    )

    return PaginatedResponse(
        data=[NotificationDeliveryResponse.model_validate(d) for d in deliveries],
        meta=PaginationMeta(
            total=total,
            page=page,
            per_page=per_page,
            pages=math.ceil(total / per_page) if total > 0 else 0,
        ),
    )


@router.post(
    "/retry",
    response_model=ApiResponse[dict],
    status_code=status.HTTP_200_OK,
)
async def post_notification_retry(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_roles(UserRole.ADMIN))],
) -> ApiResponse[dict]:
    """transient 失敗通知を即時リトライする (ADMIN 専用)。

    lifespan バックグラウンドループ (60 秒間隔) とは独立して同期実行する。
    最大 3 回リトライ済みの行や permanent 失敗行はスキップされる。
    """
    retried = await NotificationDispatcher(db).retry_transient_failures()
    return ApiResponse(
        data={
            "retried_count": len(retried),
            "message": (
                f"{len(retried)} 件の transient 失敗通知を再送信しました。"
                if retried
                else "リトライ対象の通知がありません。"
            ),
        }
    )


@router.get(
    "/stream",
    summary="SSE リアルタイム通知ストリーム (Phase 4a)",
    response_class=StreamingResponse,
)
async def get_notification_stream(
    current_user: Annotated[User, Depends(get_current_user)],
) -> StreamingResponse:
    """認証済みユーザー向け SSE ストリームエンドポイント。

    接続するとサーバーからリアルタイムに通知イベントが push される。
    クライアントは EventSource API で購読し、切断時は自動再接続する。

    イベントフォーマット:
        data: {"type": "notification", "id": "...", "title": "...", "message": "..."}

    Keep-alive として 30 秒ごとに `: ping` コメントを送信する。
    """
    q = sse_manager.connect(current_user.id)
    return StreamingResponse(
        sse_manager.event_stream(current_user.id, q),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",  # nginx buffering off
        },
    )


async def _query_deliveries(
    repo: NotificationDeliveryRepository,
    *,
    offset: int,
    limit: int,
    status: str | None,
    channel: str | None,
    event_key: str | None,
    user_id: uuid.UUID | None,
) -> tuple[list, int]:
    """配信履歴の取得とカウントを並列実行するヘルパ。"""
    deliveries = await repo.list_for_admin(
        offset=offset,
        limit=limit,
        status=status,
        channel=channel,
        event_key=event_key,
        user_id=user_id,
    )
    total = await repo.count_for_admin(
        status=status,
        channel=channel,
        event_key=event_key,
        user_id=user_id,
    )
    return deliveries, total
