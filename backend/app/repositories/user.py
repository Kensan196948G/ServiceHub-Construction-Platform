"""
ユーザーリポジトリ（DB操作レイヤー）
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.schemas.user import UserCreate, UserUpdate


class UserRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_id(self, user_id: uuid.UUID) -> User | None:
        result = await self.db.execute(
            select(User).where(User.id == user_id, User.deleted_at.is_(None))
        )
        return result.scalar_one_or_none()

    async def get_by_email(self, email: str) -> User | None:
        result = await self.db.execute(
            select(User).where(User.email == email, User.deleted_at.is_(None))
        )
        return result.scalar_one_or_none()

    async def list(
        self,
        offset: int = 0,
        limit: int = 20,
        role: str | None = None,
        is_active: bool | None = None,
    ):
        q = select(User).where(User.deleted_at.is_(None))
        if role:
            q = q.where(User.role == role)
        if is_active is not None:
            q = q.where(User.is_active == is_active)
        q = q.order_by(User.created_at.desc()).offset(offset).limit(limit)
        result = await self.db.execute(q)
        return result.scalars().all()

    async def count(
        self,
        role: str | None = None,
        is_active: bool | None = None,
    ) -> int:
        q = select(func.count()).select_from(User).where(User.deleted_at.is_(None))
        if role:
            q = q.where(User.role == role)
        if is_active is not None:
            q = q.where(User.is_active == is_active)
        result = await self.db.execute(q)
        return result.scalar_one()

    async def create(self, data: UserCreate, hashed_password: str) -> User:
        user = User(
            email=data.email,
            full_name=data.full_name,
            role=data.role,
            hashed_password=hashed_password,
            is_active=True,
        )
        self.db.add(user)
        await self.db.flush()
        await self.db.refresh(user)
        return user

    async def update(self, user: User, data: UserUpdate) -> User:
        for field, value in data.model_dump(exclude_none=True).items():
            setattr(user, field, value)
        await self.db.flush()
        await self.db.refresh(user)
        return user

    async def soft_delete(self, user: User) -> None:
        user.deleted_at = datetime.now(timezone.utc)
        user.is_active = False
        await self.db.flush()

    async def update_last_login(self, user: User) -> None:
        user.last_login_at = datetime.now(timezone.utc)
        await self.db.flush()
