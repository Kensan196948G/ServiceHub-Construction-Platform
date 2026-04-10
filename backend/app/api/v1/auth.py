"""
認証APIルーター
POST /api/v1/auth/login  - ログイン
POST /api/v1/auth/refresh - トークン更新
POST /api/v1/auth/logout  - ログアウト
GET  /api/v1/auth/me      - 現在ユーザー取得
"""

from typing import Annotated

import structlog
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.deps import get_current_user
from app.db.base import get_db
from app.models.user import User
from app.schemas.auth import (
    LoginRequest,
    LogoutRequest,
    RefreshRequest,
    TokenResponse,
    UserResponse,
)
from app.services.auth_service import (
    AuthenticationError,
    AuthorizationError,
    AuthService,
)

router = APIRouter(prefix="/auth", tags=["認証"])
logger = structlog.get_logger()


@router.post("/login", response_model=TokenResponse)
async def login(
    payload: LoginRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """ログイン - JWT発行"""
    service = AuthService(db)
    try:
        return await service.login(payload)
    except AuthenticationError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e),
        ) from None
    except AuthorizationError as e:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(e),
        ) from None


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(
    payload: RefreshRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """リフレッシュトークンで新アクセストークンを発行"""
    service = AuthService(db)
    try:
        return await service.refresh(payload.refresh_token)
    except AuthenticationError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e),
        ) from None


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: Annotated[User, Depends(get_current_user)]):
    """現在ログインユーザー情報取得"""
    return UserResponse.model_validate(current_user)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(
    payload: LogoutRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """ログアウト — refresh token の jti を Redis から削除して無効化"""
    service = AuthService(db)
    await service.logout(payload.refresh_token)
    logger.info("logout", user_id=str(current_user.id))
    return None
