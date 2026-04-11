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
from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, BackgroundTasks, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.rbac import UserRole, require_roles
from app.db.base import get_db
from app.models.user import User
from app.schemas.common import ApiResponse, PaginatedResponse, PaginationMeta
from app.schemas.daily_report import (
    DailyReportCreate,
    DailyReportResponse,
    DailyReportUpdate,
)
from app.services.daily_report_service import DailyReportService
from app.services.notification_hook import fire_notification_hook

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
    svc = DailyReportService(db)
    reports, total = await svc.list_reports(project_id, page, per_page)
    return PaginatedResponse(
        data=reports,
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
    background_tasks: BackgroundTasks,
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
    svc = DailyReportService(db)
    report = await svc.create_report(project_id, payload, created_by=current_user.id)
    now_str = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
    project_name = (
        report.project_name  # type: ignore[attr-defined]
        if hasattr(report, "project_name")
        else str(project_id)
    )
    await fire_notification_hook(
        background_tasks,
        db,
        event_key="daily_report_submitted",
        context={
            "report_id": str(report.id),
            "project_id": str(project_id),
            "project_name": project_name,
            "submitted_by": current_user.full_name,
            "submitted_at": now_str,
            "app_url": "https://servicehub.local",
        },
    )
    return ApiResponse(data=report)


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
    svc = DailyReportService(db)
    report = await svc.get_report(report_id)
    return ApiResponse(data=report)


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
    svc = DailyReportService(db)
    report = await svc.update_report(report_id, payload, updated_by=current_user.id)
    return ApiResponse(data=report)


@router.delete("/daily-reports/{report_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_daily_report(
    report_id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[
        User, Depends(require_roles(UserRole.ADMIN, UserRole.PROJECT_MANAGER))
    ],
):
    svc = DailyReportService(db)
    await svc.delete_report(report_id, deleted_by=current_user.id)
    return None
