"""安全・品質管理APIルーター"""
import uuid, math
from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.rbac import UserRole, require_roles
from app.db.base import get_db
from app.models.user import User
from app.models.safety import SafetyCheck, QualityInspection
from app.schemas.common import ApiResponse, PaginatedResponse, PaginationMeta
from app.schemas.safety import (
    SafetyCheckCreate, SafetyCheckResponse,
    QualityInspectionCreate, QualityInspectionResponse
)

router = APIRouter(tags=["安全・品質管理"])


@router.post("/projects/{project_id}/safety-checks",
             response_model=ApiResponse[SafetyCheckResponse], status_code=201)
async def create_safety_check(
    project_id: uuid.UUID, payload: SafetyCheckCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_roles(
        UserRole.ADMIN, UserRole.PROJECT_MANAGER, UserRole.SITE_SUPERVISOR
    ))],
):
    payload.project_id = project_id
    check = SafetyCheck(**payload.model_dump(), created_by=current_user.id)
    db.add(check)
    await db.flush()
    await db.refresh(check)
    return ApiResponse(data=SafetyCheckResponse.model_validate(check))


@router.get("/projects/{project_id}/safety-checks",
            response_model=PaginatedResponse[SafetyCheckResponse])
async def list_safety_checks(
    project_id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_roles(
        UserRole.ADMIN, UserRole.PROJECT_MANAGER, UserRole.SITE_SUPERVISOR, UserRole.VIEWER
    ))],
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=20, ge=1, le=100),
):
    q = select(SafetyCheck).where(
        SafetyCheck.project_id == project_id, SafetyCheck.deleted_at.is_(None)
    ).order_by(SafetyCheck.check_date.desc()).offset((page-1)*per_page).limit(per_page)
    total_q = select(func.count()).select_from(SafetyCheck).where(
        SafetyCheck.project_id == project_id, SafetyCheck.deleted_at.is_(None)
    )
    items = (await db.execute(q)).scalars().all()
    total = (await db.execute(total_q)).scalar_one()
    return PaginatedResponse(
        data=[SafetyCheckResponse.model_validate(i) for i in items],
        meta=PaginationMeta(total=total, page=page, per_page=per_page,
                            pages=math.ceil(total/per_page) if total > 0 else 0),
    )


@router.post("/projects/{project_id}/quality-inspections",
             response_model=ApiResponse[QualityInspectionResponse], status_code=201)
async def create_quality_inspection(
    project_id: uuid.UUID, payload: QualityInspectionCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_roles(
        UserRole.ADMIN, UserRole.PROJECT_MANAGER, UserRole.SITE_SUPERVISOR
    ))],
):
    payload.project_id = project_id
    insp = QualityInspection(**payload.model_dump(), created_by=current_user.id)
    db.add(insp)
    await db.flush()
    await db.refresh(insp)
    return ApiResponse(data=QualityInspectionResponse.model_validate(insp))


@router.get("/projects/{project_id}/quality-inspections",
            response_model=PaginatedResponse[QualityInspectionResponse])
async def list_quality_inspections(
    project_id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_roles(
        UserRole.ADMIN, UserRole.PROJECT_MANAGER, UserRole.SITE_SUPERVISOR, UserRole.VIEWER
    ))],
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=20, ge=1, le=100),
):
    q = select(QualityInspection).where(
        QualityInspection.project_id == project_id, QualityInspection.deleted_at.is_(None)
    ).order_by(QualityInspection.inspection_date.desc()).offset((page-1)*per_page).limit(per_page)
    total_q = select(func.count()).select_from(QualityInspection).where(
        QualityInspection.project_id == project_id, QualityInspection.deleted_at.is_(None)
    )
    items = (await db.execute(q)).scalars().all()
    total = (await db.execute(total_q)).scalar_one()
    return PaginatedResponse(
        data=[QualityInspectionResponse.model_validate(i) for i in items],
        meta=PaginationMeta(total=total, page=page, per_page=per_page,
                            pages=math.ceil(total/per_page) if total > 0 else 0),
    )
