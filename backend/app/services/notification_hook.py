"""ドメインイベントフック — Phase 2c

サービス/ルーター層から呼ばれるシンプルなヘルパ。
イベント種別 → 受信者ロール のマッピングを保持し、
BackgroundTasks への schedule_notification() 投入を一箇所で管理する。

設計書 §9.6 のフック接続点定義に対応。

=== 呼び出し規約 ===
    await fire_notification_hook(
        background_tasks=background_tasks,
        db=db,
        event_key="daily_report_submitted",
        context={"report_id": str(report.id), "project_name": ...},
    )

explicit_user_ids を指定した場合はロール解決をスキップしてそのまま使用する
(例: incident_assigned — 担当者 1 名に直接送る場合)。
"""

import uuid
from typing import Any

from fastapi import BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession

from app.repositories.user import UserRepository
from app.services.notification_dispatcher import schedule_notification

# Event key → target roles mapping (design doc §9.6)
_EVENT_ROLES: dict[str, list[str]] = {
    "daily_report_submitted": ["ADMIN", "PROJECT_MANAGER"],
    "safety_incident_created": ["ADMIN", "PROJECT_MANAGER"],
    "change_request_pending_approval": ["ADMIN"],
    "incident_assigned": [],  # explicit_user_ids のみ (担当者指定)
    "project_status_changed": ["ADMIN", "PROJECT_MANAGER"],
}


async def resolve_recipients(
    db: AsyncSession,
    event_key: str,
    *,
    explicit_user_ids: list[uuid.UUID] | None = None,
) -> list[uuid.UUID]:
    """イベントキーから通知受信者 ID リストを解決する。

    explicit_user_ids が指定されていればそれをそのまま返す。
    指定がなければ _EVENT_ROLES からロールを引き、DB でフィルタする。
    """
    if explicit_user_ids is not None:
        return explicit_user_ids
    roles = _EVENT_ROLES.get(event_key, ["ADMIN"])
    if not roles:
        return []
    return list(await UserRepository(db).get_ids_by_roles(roles))


async def fire_notification_hook(
    background_tasks: BackgroundTasks,
    db: AsyncSession,
    *,
    event_key: str,
    context: dict[str, Any],
    explicit_user_ids: list[uuid.UUID] | None = None,
) -> None:
    """通知フックをスケジュールする (fire-and-forget)。

    受信者が 0 名の場合は何もしない。
    schedule_notification() は同期関数 (BackgroundTasks.add_task を呼ぶだけ) なので
    await は不要だが、resolve_recipients は非同期のため本関数は async。
    """
    user_ids = await resolve_recipients(
        db, event_key, explicit_user_ids=explicit_user_ids
    )
    if not user_ids:
        return
    schedule_notification(
        background_tasks,
        event_key=event_key,
        user_ids=user_ids,
        context=context,
    )
