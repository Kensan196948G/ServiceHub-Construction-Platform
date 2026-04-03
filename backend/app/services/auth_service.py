"""
認証サービス（ビジネスロジック層）
ログイン・トークン管理・ユーザー検証
"""

import structlog
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
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
        tokens = self._generate_tokens(user)

        logger.info("login_success", user_id=str(user.id), role=user.role)
        return tokens

    async def refresh(self, refresh_token: str) -> TokenResponse:
        """リフレッシュトークンで新トークンペアを発行"""
        token_data = verify_token(refresh_token)
        if token_data is None or token_data.type != "refresh":
            raise AuthenticationError("リフレッシュトークンが無効です")

        import uuid

        user = await self.user_repo.get_by_id(uuid.UUID(token_data.sub))
        if not user or not user.is_active:
            raise AuthenticationError("ユーザーが見つかりません")

        return self._generate_tokens(user)

    def _generate_tokens(self, user: User) -> TokenResponse:
        """アクセストークン＋リフレッシュトークンを生成"""
        access_token = create_access_token(str(user.id), user.role)
        refresh_token = create_refresh_token(str(user.id), user.role)
        return TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        )


class AuthenticationError(Exception):
    """認証エラー（401）"""

    pass


class AuthorizationError(Exception):
    """認可エラー（403）"""

    pass
