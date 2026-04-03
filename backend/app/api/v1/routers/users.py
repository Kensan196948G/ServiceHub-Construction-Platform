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
from app.repositories.user import UserRepository
from app.schemas.common import ApiResponse, PaginatedResponse, PaginationMeta
from app.schemas.user import UserCreate, UserListResponse, UserUpdate

router = APIRouter(prefix="/users", tags=["ユーザー管理"])


@router.get("", response_model=PaginatedResponse[UserListResponse])
async def list_users(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_roles(UserRole.ADMIN))],
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=20, ge=1, le=100),
):
    repo = UserRepository(db)
    offset = (page - 1) * per_page
    users = await repo.list(offset=offset, limit=per_page)
    total = await repo.count()

    return PaginatedResponse(
        data=[UserListResponse.model_validate(u) for u in users],
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
    repo = UserRepository(db)
    existing = await repo.get_by_email(payload.email)
    if existing:
        raise HTTPException(
            status_code=400,
            detail="このメールアドレスは既に登録されています",
        )

    user = await repo.create(
        payload, hashed_password=get_password_hash(payload.password)
    )
    return ApiResponse(data=UserListResponse.model_validate(user))


@router.get("/{user_id}", response_model=ApiResponse[UserListResponse])
async def get_user(
    user_id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_roles(UserRole.ADMIN))],
):
    repo = UserRepository(db)
    user = await repo.get_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="ユーザーが見つかりません")
    return ApiResponse(data=UserListResponse.model_validate(user))


@router.put("/{user_id}", response_model=ApiResponse[UserListResponse])
async def update_user(
    user_id: uuid.UUID,
    payload: UserUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_roles(UserRole.ADMIN))],
):
    repo = UserRepository(db)
    user = await repo.get_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="ユーザーが見つかりません")

    user = await repo.update(user, payload)
    return ApiResponse(data=UserListResponse.model_validate(user))


@router.delete("/{user_id}", status_code=204)
async def delete_user(
    user_id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_roles(UserRole.ADMIN))],
):
    repo = UserRepository(db)
    user = await repo.get_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="ユーザーが見つかりません")
    if user.id == current_user.id:
        raise HTTPException(status_code=400, detail="自分自身は削除できません")
    await repo.soft_delete(user)
