"""安全・品質管理APIルーター"""

import math
import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.rbac import UserRole, require_roles
from app.db.base import get_db
from app.models.user import User
from app.repositories.safety import QualityInspectionRepository, SafetyCheckRepository
from app.schemas.common import ApiResponse, PaginatedResponse, PaginationMeta
from app.schemas.safety import (
    QualityInspectionCreate,
    QualityInspectionResponse,
    SafetyCheckCreate,
    SafetyCheckResponse,
)

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
    repo = SafetyCheckRepository(db)
    payload.project_id = project_id
    check = await repo.create(payload, created_by=current_user.id)
    return ApiResponse(data=SafetyCheckResponse.model_validate(check))


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
    repo = SafetyCheckRepository(db)
    offset = (page - 1) * per_page
    items = await repo.list(project_id, offset=offset, limit=per_page)
    total = await repo.count(project_id)
    return PaginatedResponse(
        data=[SafetyCheckResponse.model_validate(i) for i in items],
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
    repo = QualityInspectionRepository(db)
    payload.project_id = project_id
    insp = await repo.create(payload, created_by=current_user.id)
    return ApiResponse(data=QualityInspectionResponse.model_validate(insp))


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
    repo = QualityInspectionRepository(db)
    offset = (page - 1) * per_page
    items = await repo.list(project_id, offset=offset, limit=per_page)
    total = await repo.count(project_id)
    return PaginatedResponse(
        data=[QualityInspectionResponse.model_validate(i) for i in items],
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
    repo = SafetyCheckRepository(db)
    check = await repo.get_by_id(check_id)
    if not check or check.project_id != project_id:
        raise HTTPException(status_code=404, detail="安全チェックが見つかりません")
    await repo.soft_delete(check)


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
    repo = QualityInspectionRepository(db)
    insp = await repo.get_by_id(inspection_id)
    if not insp or insp.project_id != project_id:
        raise HTTPException(status_code=404, detail="品質検査が見つかりません")
    await repo.soft_delete(insp)
