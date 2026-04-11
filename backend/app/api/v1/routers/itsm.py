"""
ITSM運用管理API（ISO20000準拠）
インシデント管理・変更要求管理
ロール制御: IT_OPERATOR以上
"""

from __future__ import annotations

import math
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, BackgroundTasks, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.rbac import UserRole, require_roles
from app.db.base import get_db
from app.schemas.common import ApiResponse, PaginatedResponse, PaginationMeta
from app.schemas.itsm import (
    ChangeRequestCreate,
    ChangeRequestResponse,
    ChangeRequestUpdate,
    IncidentCreate,
    IncidentResponse,
    IncidentUpdate,
)
from app.services.itsm_service import ITSMService
from app.services.notification_hook import fire_notification_hook

router = APIRouter(prefix="/itsm", tags=["ITSM管理"])


# ---------- Incident ----------


@router.post(
    "/incidents",
    response_model=ApiResponse[IncidentResponse],
    status_code=status.HTTP_201_CREATED,
)
async def create_incident(
    payload: IncidentCreate,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(
        require_roles(UserRole.ADMIN, UserRole.IT_OPERATOR, UserRole.PROJECT_MANAGER)
    ),
):
    """インシデント起票"""
    svc = ITSMService(db)
    incident = await svc.create_incident(payload, created_by=current_user.id)
    now_str = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
    project_name = str(incident.project_id) if incident.project_id else "未設定"
    await fire_notification_hook(
        background_tasks,
        db,
        event_key="safety_incident_created",
        context={
            "incident_id": str(incident.id),
            "title": incident.title,
            "severity": incident.severity,
            "reported_by": current_user.full_name,
            "reported_at": now_str,
            "project_name": project_name,
            "app_url": "https://servicehub.local",
        },
    )
    return ApiResponse(
        data=incident,
        message="インシデントを起票しました",
    )


@router.get("/incidents", response_model=PaginatedResponse[IncidentResponse])
async def list_incidents(
    status_filter: str | None = Query(None, alias="status"),
    priority: str | None = None,
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(
        require_roles(UserRole.ADMIN, UserRole.IT_OPERATOR, UserRole.PROJECT_MANAGER)
    ),
):
    """インシデント一覧"""
    svc = ITSMService(db)
    items, total = await svc.list_incidents(
        page=page, per_page=per_page, status=status_filter, priority=priority
    )
    return PaginatedResponse(
        data=items,
        meta=PaginationMeta(
            total=total,
            page=page,
            per_page=per_page,
            pages=math.ceil(total / per_page) if total > 0 else 0,
        ),
    )


@router.get("/incidents/{incident_id}", response_model=ApiResponse[IncidentResponse])
async def get_incident(
    incident_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(
        require_roles(UserRole.ADMIN, UserRole.IT_OPERATOR, UserRole.PROJECT_MANAGER)
    ),
):
    svc = ITSMService(db)
    incident = await svc.get_incident(incident_id)
    return ApiResponse(data=incident)


@router.patch("/incidents/{incident_id}", response_model=ApiResponse[IncidentResponse])
async def update_incident(
    incident_id: uuid.UUID,
    payload: IncidentUpdate,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(
        require_roles(UserRole.ADMIN, UserRole.IT_OPERATOR, UserRole.PROJECT_MANAGER)
    ),
):
    """インシデント更新・解決"""
    svc = ITSMService(db)
    incident = await svc.update_incident(
        incident_id, payload, updated_by=current_user.id
    )
    # 担当者が新規設定された場合のみ通知 (incident_assigned)
    if payload.assigned_to is not None:
        assigned_at = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
        inc_project = (
            str(incident.project_id) if incident.project_id else "未設定"
        )
        await fire_notification_hook(
            background_tasks,
            db,
            event_key="incident_assigned",
            context={
                "incident_id": str(incident.id),
                "title": incident.title,
                "assignee_name": str(payload.assigned_to),
                "assigned_at": assigned_at,
                "project_name": inc_project,
                "app_url": "https://servicehub.local",
            },
            explicit_user_ids=[payload.assigned_to],
        )
    return ApiResponse(
        data=incident,
        message="インシデントを更新しました",
    )


# ---------- Change Request ----------


@router.post(
    "/changes",
    response_model=ApiResponse[ChangeRequestResponse],
    status_code=status.HTTP_201_CREATED,
)
async def create_change(
    payload: ChangeRequestCreate,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_roles(UserRole.ADMIN, UserRole.IT_OPERATOR)),
):
    """変更要求起票（SoD: IT_OPERATORのみ起票可）"""
    svc = ITSMService(db)
    change = await svc.create_change(payload, created_by=current_user.id)
    requested_at = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
    await fire_notification_hook(
        background_tasks,
        db,
        event_key="change_request_pending_approval",
        context={
            "change_id": str(change.id),
            "title": change.title,
            "requested_by": current_user.full_name,
            "requested_at": requested_at,
            "project_name": "ServiceHub",
            "app_url": "https://servicehub.local",
        },
    )
    return ApiResponse(
        data=change,
        message="変更要求を起票しました",
    )


@router.get("/changes", response_model=PaginatedResponse[ChangeRequestResponse])
async def list_changes(
    status_filter: str | None = Query(None, alias="status"),
    change_type: str | None = None,
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(
        require_roles(UserRole.ADMIN, UserRole.IT_OPERATOR, UserRole.PROJECT_MANAGER)
    ),
):
    svc = ITSMService(db)
    items, total = await svc.list_changes(
        page=page, per_page=per_page, status=status_filter, change_type=change_type
    )
    return PaginatedResponse(
        data=items,
        meta=PaginationMeta(
            total=total,
            page=page,
            per_page=per_page,
            pages=math.ceil(total / per_page) if total > 0 else 0,
        ),
    )


@router.patch("/changes/{change_id}", response_model=ApiResponse[ChangeRequestResponse])
async def update_change(
    change_id: uuid.UUID,
    payload: ChangeRequestUpdate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(
        require_roles(UserRole.ADMIN, UserRole.PROJECT_MANAGER, UserRole.IT_OPERATOR)
    ),
):
    """変更要求更新"""
    svc = ITSMService(db)
    change = await svc.update_change(change_id, payload, updated_by=current_user.id)
    return ApiResponse(data=change)


@router.patch(
    "/changes/{change_id}/approve", response_model=ApiResponse[ChangeRequestResponse]
)
async def approve_change(
    change_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_roles(UserRole.ADMIN)),
):
    """変更承認（SoD: ADMINのみ承認可）"""
    svc = ITSMService(db)
    change = await svc.approve_change(change_id, approved_by=current_user.id)
    return ApiResponse(
        data=change,
        message="変更要求を承認しました",
    )
