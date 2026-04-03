"""
User management service (business logic layer)
"""

import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.repositories.user import UserRepository
from app.schemas.user import UserCreate, UserListResponse, UserUpdate


class UserService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = UserRepository(db)

    async def create_user(
        self, data: UserCreate, hashed_password: str
    ) -> UserListResponse:
        existing = await self.repo.get_by_email(data.email)
        if existing:
            raise DuplicateEmailError("このメールアドレスは既に登録されています")
        user = await self.repo.create(data, hashed_password=hashed_password)
        return UserListResponse.model_validate(user)

    async def list_users(
        self, page: int, per_page: int
    ) -> tuple[list[UserListResponse], int]:
        offset = (page - 1) * per_page
        users = await self.repo.list(offset=offset, limit=per_page)
        total = await self.repo.count()
        return [UserListResponse.model_validate(u) for u in users], total

    async def get_user(self, user_id: uuid.UUID) -> UserListResponse:
        user = await self.repo.get_by_id(user_id)
        if not user:
            raise UserNotFoundError("ユーザーが見つかりません")
        return UserListResponse.model_validate(user)

    async def update_user(
        self, user_id: uuid.UUID, data: UserUpdate
    ) -> UserListResponse:
        user = await self.repo.get_by_id(user_id)
        if not user:
            raise UserNotFoundError("ユーザーが見つかりません")
        user = await self.repo.update(user, data)
        return UserListResponse.model_validate(user)

    async def delete_user(self, user_id: uuid.UUID, current_user_id: uuid.UUID) -> None:
        user = await self.repo.get_by_id(user_id)
        if not user:
            raise UserNotFoundError("ユーザーが見つかりません")
        if user.id == current_user_id:
            raise SelfDeletionError("自分自身は削除できません")
        await self.repo.soft_delete(user)


class UserNotFoundError(Exception):
    """User not found"""


class DuplicateEmailError(Exception):
    """Email already registered"""


class SelfDeletionError(Exception):
    """Cannot delete self"""
