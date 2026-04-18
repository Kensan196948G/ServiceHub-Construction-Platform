"""
API依存性注入
JWT認証・現在ユーザー取得
"""

import uuid
from typing import Annotated

from fastapi import Depends, HTTPException, Query, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import verify_token
from app.db.base import get_db

security = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(security)],
    db: Annotated[AsyncSession, Depends(get_db)],
    token_query: Annotated[str | None, Query(alias="token")] = None,
):
    """JWTトークン検証→ユーザー取得"""
    from app.models.user import User

    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="認証に失敗しました",
        headers={"WWW-Authenticate": "Bearer"},
    )

    # Support token via query param for SSE (EventSource cannot set headers)
    raw_token = credentials.credentials if credentials else token_query
    if raw_token is None:
        raise credentials_exception

    token_data = verify_token(raw_token)
    if token_data is None:
        raise credentials_exception

    try:
        user_uuid = uuid.UUID(token_data.sub)
    except (ValueError, AttributeError):
        raise credentials_exception from None

    result = await db.execute(
        select(User).where(User.id == user_uuid, User.deleted_at.is_(None))
    )
    user = result.scalar_one_or_none()
    if user is None or not user.is_active:
        raise credentials_exception

    return user
