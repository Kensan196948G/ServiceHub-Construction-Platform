"""原価・工数管理APIルーター"""

import math
import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.rbac import UserRole, require_roles
from app.db.base import get_db
from app.models.user import User
from app.schemas.common import ApiResponse, PaginatedResponse, PaginationMeta
from app.schemas.cost import (
    CostRecordCreate,
    CostRecordResponse,
    CostSummary,
    WorkHourCreate,
    WorkHourResponse,
)
from app.services.cost_service import CostService

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
    """原価記録を新規作成します。

    - `category`: `materials` / `labor` / `equipment` / `subcontract` / `other`
    - `amount`: 税込金額（円、正の整数）
    - 権限: COST_MANAGER 以上
    """
    svc = CostService(db)
    data = await svc.create_record(project_id, payload, created_by=current_user.id)
    return ApiResponse(data=data)


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
    svc = CostService(db)
    items, total = await svc.list_records(project_id, page, per_page)
    return PaginatedResponse(
        data=items,
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
    """案件の予実対比サマリーを取得します。

    予算総額・実績合計・差異・進捗率をカテゴリ別に集計して返します。
    権限: COST_MANAGER 以上
    """
    svc = CostService(db)
    summary = await svc.get_summary(project_id)
    return ApiResponse(data=summary)


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
    svc = CostService(db)
    data = await svc.create_work_hour(project_id, payload, created_by=current_user.id)
    return ApiResponse(data=data)


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
    svc = CostService(db)
    await svc.delete_record(project_id, record_id)
