"""安全・品質管理APIルーター"""

import math
import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.rbac import UserRole, require_roles
from app.db.base import get_db
from app.models.user import User
from app.schemas.common import ApiResponse, PaginatedResponse, PaginationMeta
from app.schemas.safety import (
    QualityInspectionCreate,
    QualityInspectionResponse,
    SafetyCheckCreate,
    SafetyCheckResponse,
)
from app.services.safety_service import SafetyService

router = APIRouter(tags=["安全・品質管理"])


@router.post(
    "/projects/{project_id}/safety-checks",
    response_model=ApiResponse[SafetyCheckResponse],
    status_code=201,
)
async def create_safety_check(
    project_id: uuid.UUID,
    payload: SafetyCheckCreate,
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
    """安全確認チェックリストを記録します。

    - 1 日 1 案件につき複数回記録可能
    - `items`: チェック項目ごとに `category`, `checked` (bool), `note` を含む配列
    - 権限: SITE_SUPERVISOR 以上
    """
    svc = SafetyService(db)
    data = await svc.create_safety_check(
        project_id, payload, created_by=current_user.id
    )
    return ApiResponse(data=data)


@router.get(
    "/projects/{project_id}/safety-checks",
    response_model=PaginatedResponse[SafetyCheckResponse],
)
async def list_safety_checks(
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
    svc = SafetyService(db)
    items, total = await svc.list_safety_checks(project_id, page, per_page)
    return PaginatedResponse(
        data=items,
        meta=PaginationMeta(
            total=total,
            page=page,
            per_page=per_page,
            pages=math.ceil(total / per_page) if total > 0 else 0,
        ),
    )


@router.post(
    "/projects/{project_id}/quality-inspections",
    response_model=ApiResponse[QualityInspectionResponse],
    status_code=201,
)
async def create_quality_inspection(
    project_id: uuid.UUID,
    payload: QualityInspectionCreate,
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
    svc = SafetyService(db)
    data = await svc.create_quality_inspection(
        project_id, payload, created_by=current_user.id
    )
    return ApiResponse(data=data)


@router.get(
    "/projects/{project_id}/quality-inspections",
    response_model=PaginatedResponse[QualityInspectionResponse],
)
async def list_quality_inspections(
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
    svc = SafetyService(db)
    items, total = await svc.list_quality_inspections(project_id, page, per_page)
    return PaginatedResponse(
        data=items,
        meta=PaginationMeta(
            total=total,
            page=page,
            per_page=per_page,
            pages=math.ceil(total / per_page) if total > 0 else 0,
        ),
    )


@router.delete(
    "/projects/{project_id}/safety-checks/{check_id}",
    status_code=204,
)
async def delete_safety_check(
    project_id: uuid.UUID,
    check_id: uuid.UUID,
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
    svc = SafetyService(db)
    await svc.delete_safety_check(project_id, check_id)


@router.delete(
    "/projects/{project_id}/quality-inspections/{inspection_id}",
    status_code=204,
)
async def delete_quality_inspection(
    project_id: uuid.UUID,
    inspection_id: uuid.UUID,
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
    svc = SafetyService(db)
    await svc.delete_quality_inspection(project_id, inspection_id)
