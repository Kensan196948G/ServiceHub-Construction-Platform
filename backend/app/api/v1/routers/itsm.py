"""
ITSM運用管理API（ISO20000準拠）
インシデント管理・変更要求管理
ロール制御: IT_OPERATOR以上
"""

from __future__ import annotations

import math
import secrets
import uuid
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.rbac import UserRole, require_roles
from app.db.base import get_db
from app.models.itsm import ChangeRequest, Incident
from app.schemas.common import ApiResponse, PaginatedResponse, PaginationMeta
from app.schemas.itsm import (
    ChangeRequestCreate,
    ChangeRequestResponse,
    IncidentCreate,
    IncidentResponse,
    IncidentUpdate,
)

router = APIRouter(prefix="/itsm", tags=["ITSM管理"])


def _gen_incident_number() -> str:
    ts = datetime.now(UTC).strftime("%Y%m%d")
    return f"INC-{ts}-{secrets.token_hex(3).upper()}"


def _gen_change_number() -> str:
    ts = datetime.now(UTC).strftime("%Y%m%d")
    return f"CHG-{ts}-{secrets.token_hex(3).upper()}"


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
    incident = Incident(
        incident_number=_gen_incident_number(),
        title=payload.title,
        description=payload.description,
        category=payload.category,
        priority=payload.priority,
        severity=payload.severity,
        assigned_to=payload.assigned_to,
        project_id=payload.project_id,
        created_by=current_user.id,
        updated_by=current_user.id,
    )
    db.add(incident)
    await db.commit()
    await db.refresh(incident)
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
    conditions = [Incident.deleted_at.is_(None)]
    if status_filter:
        conditions.append(Incident.status == status_filter)  # type: ignore[arg-type]
    if priority:
        conditions.append(Incident.priority == priority)  # type: ignore[arg-type]

    total_result = await db.execute(
        select(func.count()).select_from(Incident).where(and_(*conditions))
    )
    total = total_result.scalar_one()

    result = await db.execute(
        select(Incident)
        .where(and_(*conditions))
        .order_by(Incident.created_at.desc())
        .offset((page - 1) * per_page)
        .limit(per_page)
    )
    items = [IncidentResponse.model_validate(r) for r in result.scalars()]
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
    result = await db.execute(
        select(Incident).where(
            and_(Incident.id == incident_id, Incident.deleted_at.is_(None))
        )
    )
    incident = result.scalar_one_or_none()
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
    result = await db.execute(
        select(Incident).where(
            and_(Incident.id == incident_id, Incident.deleted_at.is_(None))
        )
    )
    incident = result.scalar_one_or_none()
    if not incident:
        raise HTTPException(status_code=404, detail="インシデントが見つかりません")

    update_data = payload.model_dump(exclude_none=True)
    update_data["updated_by"] = current_user.id
    if update_data.get("status") == "RESOLVED" and not incident.resolved_at:
        update_data["resolved_at"] = datetime.now(UTC)

    for k, v in update_data.items():
        setattr(incident, k, v)
    await db.commit()
    await db.refresh(incident)
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
    change = ChangeRequest(
        change_number=_gen_change_number(),
        title=payload.title,
        description=payload.description,
        change_type=payload.change_type,
        risk_level=payload.risk_level,
        impact=payload.impact,
        rollback_plan=payload.rollback_plan,
        scheduled_start=payload.scheduled_start,
        scheduled_end=payload.scheduled_end,
        created_by=current_user.id,
        updated_by=current_user.id,
    )
    db.add(change)
    await db.commit()
    await db.refresh(change)
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
    conditions = [ChangeRequest.deleted_at.is_(None)]
    if status_filter:
        conditions.append(ChangeRequest.status == status_filter)  # type: ignore[arg-type]
    if change_type:
        conditions.append(ChangeRequest.change_type == change_type)  # type: ignore[arg-type]

    total_result = await db.execute(
        select(func.count()).select_from(ChangeRequest).where(and_(*conditions))
    )
    total = total_result.scalar_one()

    result = await db.execute(
        select(ChangeRequest)
        .where(and_(*conditions))
        .order_by(ChangeRequest.created_at.desc())
        .offset((page - 1) * per_page)
        .limit(per_page)
    )
    items = [ChangeRequestResponse.model_validate(r) for r in result.scalars()]
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
    result = await db.execute(
        select(ChangeRequest).where(
            and_(ChangeRequest.id == change_id, ChangeRequest.deleted_at.is_(None))
        )
    )
    change = result.scalar_one_or_none()
    if not change:
        raise HTTPException(status_code=404, detail="変更要求が見つかりません")
    if change.status not in ("DRAFT", "REVIEW"):
        raise HTTPException(
            status_code=400, detail=f"ステータス{change.status}は承認できません"
        )

    change.status = "APPROVED"
    change.approved_by = current_user.id
    change.approved_at = datetime.now(UTC)
    change.updated_by = current_user.id
    await db.commit()
    await db.refresh(change)
    return ApiResponse(
        data=ChangeRequestResponse.model_validate(change),
        message="変更要求を承認しました",
    )
