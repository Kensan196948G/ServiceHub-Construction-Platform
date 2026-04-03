"""
ユーザー管理APIルーター（ADMIN専用）
GET    /api/v1/users          - 一覧（ページネーション）
POST   /api/v1/users          - 新規作成
GET    /api/v1/users/{id}     - 詳細
PUT    /api/v1/users/{id}     - 更新（role/is_active）
"""

import math
import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.rbac import UserRole, require_roles
from app.core.security import get_password_hash
from app.db.base import get_db
from app.models.user import User
from app.schemas.common import ApiResponse, PaginatedResponse, PaginationMeta
from app.schemas.user import UserCreate, UserListResponse, UserUpdate
from app.services.user_service import (
    DuplicateEmailError,
    SelfDeletionError,
    UserNotFoundError,
    UserService,
)

router = APIRouter(prefix="/users", tags=["ユーザー管理"])


@router.get("", response_model=PaginatedResponse[UserListResponse])
async def list_users(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_roles(UserRole.ADMIN))],
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=20, ge=1, le=100),
):
    svc = UserService(db)
    users, total = await svc.list_users(page, per_page)

    return PaginatedResponse(
        data=users,
        meta=PaginationMeta(
            total=total,
            page=page,
            per_page=per_page,
            pages=math.ceil(total / per_page) if total > 0 else 0,
        ),
    )


@router.post(
    "",
    response_model=ApiResponse[UserListResponse],
    status_code=status.HTTP_201_CREATED,
)
async def create_user(
    payload: UserCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_roles(UserRole.ADMIN))],
):
    svc = UserService(db)
    try:
        user = await svc.create_user(
            payload, hashed_password=get_password_hash(payload.password)
        )
    except DuplicateEmailError as e:
        raise HTTPException(status_code=400, detail=str(e)) from None
    return ApiResponse(data=user)


@router.get("/{user_id}", response_model=ApiResponse[UserListResponse])
async def get_user(
    user_id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_roles(UserRole.ADMIN))],
):
    svc = UserService(db)
    try:
        user = await svc.get_user(user_id)
    except UserNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e)) from None
    return ApiResponse(data=user)


@router.put("/{user_id}", response_model=ApiResponse[UserListResponse])
async def update_user(
    user_id: uuid.UUID,
    payload: UserUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_roles(UserRole.ADMIN))],
):
    svc = UserService(db)
    try:
        user = await svc.update_user(user_id, payload)
    except UserNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e)) from None
    return ApiResponse(data=user)


@router.delete("/{user_id}", status_code=204)
async def delete_user(
    user_id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_roles(UserRole.ADMIN))],
):
    svc = UserService(db)
    try:
        await svc.delete_user(user_id, current_user.id)
    except UserNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e)) from None
    except SelfDeletionError as e:
        raise HTTPException(status_code=400, detail=str(e)) from None
