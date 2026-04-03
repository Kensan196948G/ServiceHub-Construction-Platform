"""
工事案件APIルーター
GET    /api/v1/projects       - 一覧
POST   /api/v1/projects       - 新規作成
GET    /api/v1/projects/{id}  - 詳細
PUT    /api/v1/projects/{id}  - 更新
DELETE /api/v1/projects/{id}  - 論理削除
"""

import math
import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.rbac import UserRole, require_roles
from app.db.base import get_db
from app.models.user import User
from app.schemas.common import ApiResponse, PaginatedResponse, PaginationMeta
from app.schemas.project import ProjectCreate, ProjectResponse, ProjectUpdate
from app.services.project_service import (
    DuplicateProjectCodeError,
    ProjectNotFoundError,
    ProjectService,
)

router = APIRouter(prefix="/projects", tags=["工事案件管理"])


@router.get("", response_model=PaginatedResponse[ProjectResponse])
async def list_projects(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[
        User,
        Depends(
            require_roles(
                UserRole.ADMIN,
                UserRole.PROJECT_MANAGER,
                UserRole.SITE_SUPERVISOR,
                UserRole.COST_MANAGER,
                UserRole.VIEWER,
            )
        ),
    ],
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=20, ge=1, le=100),
    filter_status: str | None = Query(default=None, alias="status"),
):
    svc = ProjectService(db)
    projects, total = await svc.list_projects(page, per_page, status=filter_status)
    return PaginatedResponse(
        data=projects,
        meta=PaginationMeta(
            total=total,
            page=page,
            per_page=per_page,
            pages=math.ceil(total / per_page) if total > 0 else 0,
        ),
    )


@router.post(
    "", response_model=ApiResponse[ProjectResponse], status_code=status.HTTP_201_CREATED
)
async def create_project(
    payload: ProjectCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[
        User, Depends(require_roles(UserRole.ADMIN, UserRole.PROJECT_MANAGER))
    ],
):
    svc = ProjectService(db)
    try:
        project = await svc.create_project(payload, created_by=current_user.id)
    except DuplicateProjectCodeError:
        raise HTTPException(
            status_code=400, detail="案件コードが既に存在します"
        ) from None
    return ApiResponse(data=project)


@router.get("/{project_id}", response_model=ApiResponse[ProjectResponse])
async def get_project(
    project_id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[
        User,
        Depends(
            require_roles(
                UserRole.ADMIN,
                UserRole.PROJECT_MANAGER,
                UserRole.SITE_SUPERVISOR,
                UserRole.COST_MANAGER,
                UserRole.VIEWER,
            )
        ),
    ],
):
    svc = ProjectService(db)
    try:
        project = await svc.get_project(project_id)
    except ProjectNotFoundError:
        raise HTTPException(status_code=404, detail="案件が見つかりません") from None
    return ApiResponse(data=project)


@router.put("/{project_id}", response_model=ApiResponse[ProjectResponse])
async def update_project(
    project_id: uuid.UUID,
    payload: ProjectUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[
        User, Depends(require_roles(UserRole.ADMIN, UserRole.PROJECT_MANAGER))
    ],
):
    svc = ProjectService(db)
    try:
        project = await svc.update_project(
            project_id, payload, updated_by=current_user.id
        )
    except ProjectNotFoundError:
        raise HTTPException(status_code=404, detail="案件が見つかりません") from None
    return ApiResponse(data=project)


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_project(
    project_id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_roles(UserRole.ADMIN))],
):
    svc = ProjectService(db)
    try:
        await svc.delete_project(project_id, deleted_by=current_user.id)
    except ProjectNotFoundError:
        raise HTTPException(status_code=404, detail="案件が見つかりません") from None
    return None
