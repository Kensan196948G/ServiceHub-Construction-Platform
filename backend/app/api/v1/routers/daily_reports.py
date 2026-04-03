"""
日報APIルーター
GET    /api/v1/projects/{project_id}/daily-reports
POST   /api/v1/projects/{project_id}/daily-reports
GET    /api/v1/daily-reports/{id}
PUT    /api/v1/daily-reports/{id}
DELETE /api/v1/daily-reports/{id}
"""

import math
import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.rbac import UserRole, require_roles
from app.db.base import get_db
from app.models.user import User
from app.repositories.daily_report import DailyReportRepository
from app.schemas.common import ApiResponse, PaginatedResponse, PaginationMeta
from app.schemas.daily_report import (
    DailyReportCreate,
    DailyReportResponse,
    DailyReportUpdate,
)

router = APIRouter(tags=["日報管理"])


@router.get(
    "/projects/{project_id}/daily-reports",
    response_model=PaginatedResponse[DailyReportResponse],
)
async def list_daily_reports(
    project_id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[
        User,
        Depends(
            require_roles(
                UserRole.ADMIN,
                UserRole.PROJECT_MANAGER,
                UserRole.SITE_SUPERVISOR,
                UserRole.VIEWER,
            )
        ),
    ],
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=20, ge=1, le=100),
):
    repo = DailyReportRepository(db)
    offset = (page - 1) * per_page
    reports = await repo.list(project_id=project_id, offset=offset, limit=per_page)
    total = await repo.count(project_id=project_id)
    return PaginatedResponse(
        data=[DailyReportResponse.model_validate(r) for r in reports],
        meta=PaginationMeta(
            total=total,
            page=page,
            per_page=per_page,
            pages=math.ceil(total / per_page) if total > 0 else 0,
        ),
    )


@router.post(
    "/projects/{project_id}/daily-reports",
    response_model=ApiResponse[DailyReportResponse],
    status_code=status.HTTP_201_CREATED,
)
async def create_daily_report(
    project_id: uuid.UUID,
    payload: DailyReportCreate,
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
    repo = DailyReportRepository(db)
    report = await repo.create(payload, created_by=current_user.id)
    return ApiResponse(data=DailyReportResponse.model_validate(report))


@router.get(
    "/daily-reports/{report_id}", response_model=ApiResponse[DailyReportResponse]
)
async def get_daily_report(
    report_id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[
        User,
        Depends(
            require_roles(
                UserRole.ADMIN,
                UserRole.PROJECT_MANAGER,
                UserRole.SITE_SUPERVISOR,
                UserRole.VIEWER,
            )
        ),
    ],
):
    repo = DailyReportRepository(db)
    report = await repo.get_by_id(report_id)
    if not report:
        raise HTTPException(status_code=404, detail="日報が見つかりません")
    return ApiResponse(data=DailyReportResponse.model_validate(report))


@router.put(
    "/daily-reports/{report_id}", response_model=ApiResponse[DailyReportResponse]
)
async def update_daily_report(
    report_id: uuid.UUID,
    payload: DailyReportUpdate,
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
    repo = DailyReportRepository(db)
    report = await repo.get_by_id(report_id)
    if not report:
        raise HTTPException(status_code=404, detail="日報が見つかりません")
    report = await repo.update(report, payload, updated_by=current_user.id)
    return ApiResponse(data=DailyReportResponse.model_validate(report))


@router.delete("/daily-reports/{report_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_daily_report(
    report_id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[
        User, Depends(require_roles(UserRole.ADMIN, UserRole.PROJECT_MANAGER))
    ],
):
    repo = DailyReportRepository(db)
    report = await repo.get_by_id(report_id)
    if not report:
        raise HTTPException(status_code=404, detail="日報が見つかりません")
    await repo.soft_delete(report, deleted_by=current_user.id)
    return None
