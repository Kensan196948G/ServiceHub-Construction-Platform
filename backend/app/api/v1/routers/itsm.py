"""
ITSM運用管理API（ISO20000準拠）
インシデント管理・変更要求管理
ロール制御: IT_OPERATOR以上
"""

from __future__ import annotations

import math
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.rbac import UserRole, require_roles
from app.db.base import get_db
from app.repositories.itsm import ChangeRequestRepository, IncidentRepository
from app.schemas.common import ApiResponse, PaginatedResponse, PaginationMeta
from app.schemas.itsm import (
    ChangeRequestCreate,
    ChangeRequestResponse,
    IncidentCreate,
    IncidentResponse,
    IncidentUpdate,
)

router = APIRouter(prefix="/itsm", tags=["ITSM管理"])


# ---------- Incident ----------


@router.post(
    "/incidents",
    response_model=ApiResponse[IncidentResponse],
    status_code=status.HTTP_201_CREATED,
)
async def create_incident(
    payload: IncidentCreate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(
        require_roles(UserRole.ADMIN, UserRole.IT_OPERATOR, UserRole.PROJECT_MANAGER)
    ),
):
    """インシデント起票"""
    repo = IncidentRepository(db)
    incident = await repo.create(payload, created_by=current_user.id)
    return ApiResponse(
        data=IncidentResponse.model_validate(incident),
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
    repo = IncidentRepository(db)
    offset = (page - 1) * per_page
    total = await repo.count(status=status_filter, priority=priority)
    items_raw = await repo.list(
        offset=offset, limit=per_page, status=status_filter, priority=priority
    )
    items = [IncidentResponse.model_validate(r) for r in items_raw]
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
    repo = IncidentRepository(db)
    incident = await repo.get_by_id(incident_id)
    if not incident:
        raise HTTPException(status_code=404, detail="インシデントが見つかりません")
    return ApiResponse(data=IncidentResponse.model_validate(incident))


@router.patch("/incidents/{incident_id}", response_model=ApiResponse[IncidentResponse])
async def update_incident(
    incident_id: uuid.UUID,
    payload: IncidentUpdate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(
        require_roles(UserRole.ADMIN, UserRole.IT_OPERATOR, UserRole.PROJECT_MANAGER)
    ),
):
    """インシデント更新・解決"""
    repo = IncidentRepository(db)
    incident = await repo.get_by_id(incident_id)
    if not incident:
        raise HTTPException(status_code=404, detail="インシデントが見つかりません")

    # RESOLVED ステータス設定時に resolved_at を自動セット
    if payload.status == "RESOLVED" and not incident.resolved_at:
        incident.resolved_at = datetime.now(timezone.utc)

    incident = await repo.update(incident, payload, updated_by=current_user.id)
    return ApiResponse(
        data=IncidentResponse.model_validate(incident),
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
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_roles(UserRole.ADMIN, UserRole.IT_OPERATOR)),
):
    """変更要求起票（SoD: IT_OPERATORのみ起票可）"""
    repo = ChangeRequestRepository(db)
    change = await repo.create(payload, created_by=current_user.id)
    return ApiResponse(
        data=ChangeRequestResponse.model_validate(change),
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
    repo = ChangeRequestRepository(db)
    offset = (page - 1) * per_page
    total = await repo.count(status=status_filter, change_type=change_type)
    items_raw = await repo.list(
        offset=offset, limit=per_page, status=status_filter, change_type=change_type
    )
    items = [ChangeRequestResponse.model_validate(r) for r in items_raw]
    return PaginatedResponse(
        data=items,
        meta=PaginationMeta(
            total=total,
            page=page,
            per_page=per_page,
            pages=math.ceil(total / per_page) if total > 0 else 0,
        ),
    )


@router.patch(
    "/changes/{change_id}/approve", response_model=ApiResponse[ChangeRequestResponse]
)
async def approve_change(
    change_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_roles(UserRole.ADMIN)),
):
    """変更承認（SoD: ADMINのみ承認可）"""
    repo = ChangeRequestRepository(db)
    change = await repo.get_by_id(change_id)
    if not change:
        raise HTTPException(status_code=404, detail="変更要求が見つかりません")
    if change.status not in ("DRAFT", "REVIEW"):
        raise HTTPException(
            status_code=400, detail=f"ステータス{change.status}は承認できません"
        )

    change.status = "APPROVED"
    change.approved_by = current_user.id
    change.approved_at = datetime.now(timezone.utc)
    change.updated_by = current_user.id
    await db.flush()
    await db.refresh(change)
    return ApiResponse(
        data=ChangeRequestResponse.model_validate(change),
        message="変更要求を承認しました",
    )
