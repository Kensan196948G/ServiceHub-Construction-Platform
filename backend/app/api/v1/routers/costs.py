"""原価・工数管理APIルーター"""

import math
import uuid
from decimal import Decimal
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.rbac import UserRole, require_roles
from app.db.base import get_db
from app.models.user import User
from app.repositories.cost import CostRecordRepository, WorkHourRepository
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
    repo = CostRecordRepository(db)
    payload.project_id = project_id
    record = await repo.create(payload, created_by=current_user.id)
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
    repo = CostRecordRepository(db)
    offset = (page - 1) * per_page
    items = await repo.list(project_id, offset=offset, limit=per_page)
    total = await repo.count(project_id)
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
    "/projects/{project_id}/cost-summary",
    response_model=ApiResponse[CostSummary],
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
    repo = CostRecordRepository(db)
    summary = await repo.get_summary(project_id)
    by_category = await repo.get_summary_by_category(project_id)

    total_budgeted = summary["total_budget"]
    total_actual = summary["total_actual"]
    variance = summary["variance"]
    variance_rate = (
        float(variance / total_budgeted * 100) if total_budgeted else 0.0
    )

    return ApiResponse(
        data=CostSummary(
            project_id=project_id,
            total_budgeted=Decimal(str(total_budgeted)),
            total_actual=Decimal(str(total_actual)),
            variance=Decimal(str(variance)),
            variance_rate=round(variance_rate, 2),
            by_category={
                item["category"]: {
                    "budgeted": float(item["budget"]),
                    "actual": float(item["actual"]),
                }
                for item in by_category
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
    repo = WorkHourRepository(db)
    payload.project_id = project_id
    wh = await repo.create(payload, created_by=current_user.id)
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
    repo = CostRecordRepository(db)
    record = await repo.get_by_id(record_id)
    if not record or record.project_id != project_id:
        raise HTTPException(
            status_code=404, detail="原価記録が見つかりません"
        )
    await repo.soft_delete(record)
