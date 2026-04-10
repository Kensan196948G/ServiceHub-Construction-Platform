"""
認証サービス（ビジネスロジック層）
ログイン・トークン管理・ユーザー検証
"""

import uuid

import structlog
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.exceptions import ForbiddenError, ServiceError
from app.core.redis_client import (
    consume_refresh_jti,
    revoke_refresh_jti,
    store_refresh_jti,
)
from app.core.security import (
    create_access_token,
    create_refresh_token,
    verify_password,
    verify_token,
)
from app.models.user import User
from app.repositories.user import UserRepository
from app.schemas.auth import LoginRequest, TokenResponse

logger = structlog.get_logger()

# Refresh token TTL must match security.py REFRESH_TOKEN_EXPIRE_DAYS
_REFRESH_TTL_SECONDS = settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 3600


class AuthService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.user_repo = UserRepository(db)

    async def login(self, payload: LoginRequest) -> TokenResponse:
        """ログイン処理: 認証→トークン発行→ログイン日時更新"""
        user = await self.user_repo.get_by_email(payload.email)

        if not user or not verify_password(payload.password, user.hashed_password):
            logger.warning("login_failed", email=payload.email)
            raise AuthenticationError(
                "メールアドレスまたはパスワードが正しくありません"
            )

        if not user.is_active:
            raise AuthorizationError("アカウントが無効化されています")

        await self.user_repo.update_last_login(user)
        tokens = await self._generate_tokens(user)

        logger.info("login_success", user_id=str(user.id), role=user.role)
        return tokens

    async def refresh(self, refresh_token: str) -> TokenResponse:
        """リフレッシュトークンで新トークンペアを発行（旧 jti を失効して rotation）"""
        token_data = verify_token(refresh_token)
        if token_data is None or token_data.type != "refresh":
            raise AuthenticationError("リフレッシュトークンが無効です")

        # Consume the JTI atomically — returns False if already used or revoked
        valid = await consume_refresh_jti(token_data.jti)
        if not valid:
            logger.warning(
                "refresh_jti_reuse_detected",
                jti=token_data.jti,
                user_id=token_data.sub,
            )
            raise AuthenticationError("リフレッシュトークンが無効です")

        user = await self.user_repo.get_by_id(uuid.UUID(token_data.sub))
        if not user or not user.is_active:
            raise AuthenticationError("ユーザーが見つかりません")

        return await self._generate_tokens(user)

    async def logout(self, refresh_token: str | None) -> None:
        """ログアウト: refresh token の jti を Redis から削除して無効化"""
        if not refresh_token:
            return
        token_data = verify_token(refresh_token)
        if token_data and token_data.type == "refresh":
            await revoke_refresh_jti(token_data.jti)
            logger.info("refresh_token_revoked", jti=token_data.jti)

    async def _generate_tokens(self, user: User) -> TokenResponse:
        """アクセス + リフレッシュトークンを生成し refresh jti を Redis に登録"""
        access_token = create_access_token(str(user.id), user.role)
        refresh_token = create_refresh_token(str(user.id), user.role)

        # Register the new refresh token JTI so it can be consumed once
        refresh_data = verify_token(refresh_token)
        if refresh_data:
            await store_refresh_jti(refresh_data.jti, _REFRESH_TTL_SECONDS)

        return TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        )


class AuthenticationError(ServiceError):
    status_code = 401
    detail = "認証に失敗しました"


class AuthorizationError(ForbiddenError):
    detail = "アクセスが拒否されました"
