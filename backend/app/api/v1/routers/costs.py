"""原価・工数管理APIルーター"""

import math
import uuid
from datetime import UTC, datetime
from decimal import Decimal
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.rbac import UserRole, require_roles
from app.db.base import get_db
from app.models.cost import CostRecord, WorkHour
from app.models.user import User
from app.schemas.common import ApiResponse, PaginatedResponse, PaginationMeta
from app.schemas.cost import (
    CostRecordCreate,
    CostRecordResponse,
    CostSummary,
    WorkHourCreate,
    WorkHourResponse,
)

router = APIRouter(tags=["原価・工数管理"])


@router.post(
    "/projects/{project_id}/cost-records",
    response_model=ApiResponse[CostRecordResponse],
    status_code=201,
)
async def create_cost_record(
    project_id: uuid.UUID,
    payload: CostRecordCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[
        User,
        Depends(
            require_roles(
                UserRole.ADMIN, UserRole.PROJECT_MANAGER, UserRole.COST_MANAGER
            )
        ),
    ],
):
    payload.project_id = project_id
    record = CostRecord(**payload.model_dump(), created_by=current_user.id)
    db.add(record)
    await db.flush()
    await db.refresh(record)
    return ApiResponse(data=CostRecordResponse.model_validate(record))


@router.get(
    "/projects/{project_id}/cost-records",
    response_model=PaginatedResponse[CostRecordResponse],
)
async def list_cost_records(
    project_id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[
        User,
        Depends(
            require_roles(
                UserRole.ADMIN, UserRole.PROJECT_MANAGER, UserRole.COST_MANAGER
            )
        ),
    ],
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=20, ge=1, le=100),
):
    q = (
        select(CostRecord)
        .where(CostRecord.project_id == project_id, CostRecord.deleted_at.is_(None))
        .order_by(CostRecord.record_date.desc())
        .offset((page - 1) * per_page)
        .limit(per_page)
    )
    total_q = (
        select(func.count())
        .select_from(CostRecord)
        .where(CostRecord.project_id == project_id, CostRecord.deleted_at.is_(None))
    )
    items = (await db.execute(q)).scalars().all()
    total = (await db.execute(total_q)).scalar_one()
    return PaginatedResponse(
        data=[CostRecordResponse.model_validate(i) for i in items],
        meta=PaginationMeta(
            total=total,
            page=page,
            per_page=per_page,
            pages=math.ceil(total / per_page) if total > 0 else 0,
        ),
    )


@router.get(
    "/projects/{project_id}/cost-summary", response_model=ApiResponse[CostSummary]
)
async def get_cost_summary(
    project_id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[
        User,
        Depends(
            require_roles(
                UserRole.ADMIN, UserRole.PROJECT_MANAGER, UserRole.COST_MANAGER
            )
        ),
    ],
):
    """予実対比サマリー"""
    q = (
        select(
            CostRecord.category,
            func.sum(CostRecord.budgeted_amount).label("budgeted"),
            func.sum(CostRecord.actual_amount).label("actual"),
        )
        .where(CostRecord.project_id == project_id, CostRecord.deleted_at.is_(None))
        .group_by(CostRecord.category)
    )
    rows = (await db.execute(q)).all()

    total_budgeted = sum(r.budgeted or 0 for r in rows)
    total_actual = sum(r.actual or 0 for r in rows)
    variance = total_budgeted - total_actual
    variance_rate = float(variance / total_budgeted * 100) if total_budgeted else 0.0

    return ApiResponse(
        data=CostSummary(
            project_id=project_id,
            total_budgeted=Decimal(str(total_budgeted)),
            total_actual=Decimal(str(total_actual)),
            variance=Decimal(str(variance)),
            variance_rate=round(variance_rate, 2),
            by_category={
                r.category: {
                    "budgeted": float(r.budgeted or 0),
                    "actual": float(r.actual or 0),
                }
                for r in rows
            },
        )
    )


@router.post(
    "/projects/{project_id}/work-hours",
    response_model=ApiResponse[WorkHourResponse],
    status_code=201,
)
async def create_work_hour(
    project_id: uuid.UUID,
    payload: WorkHourCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[
        User,
        Depends(
            require_roles(
                UserRole.ADMIN, UserRole.PROJECT_MANAGER, UserRole.SITE_SUPERVISOR
            )
        ),
    ],
):
    payload.project_id = project_id
    wh = WorkHour(**payload.model_dump(), created_by=current_user.id)
    db.add(wh)
    await db.flush()
    await db.refresh(wh)
    return ApiResponse(data=WorkHourResponse.model_validate(wh))


@router.delete(
    "/projects/{project_id}/cost-records/{record_id}",
    status_code=204,
)
async def delete_cost_record(
    project_id: uuid.UUID,
    record_id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[
        User,
        Depends(
            require_roles(
                UserRole.ADMIN, UserRole.PROJECT_MANAGER, UserRole.COST_MANAGER
            )
        ),
    ],
):
    record = await db.get(CostRecord, record_id)
    if not record or record.deleted_at or record.project_id != project_id:
        raise HTTPException(status_code=404, detail="原価記録が見つかりません")
    record.deleted_at = datetime.now(UTC)
    await db.commit()
