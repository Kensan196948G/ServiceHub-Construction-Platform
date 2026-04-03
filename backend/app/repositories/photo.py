"""
写真リポジトリ（DB操作）
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.photo import Photo
from app.schemas.photo import PhotoUpdate


class PhotoRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_id(self, photo_id: uuid.UUID) -> Photo | None:
        result = await self.db.execute(
            select(Photo).where(Photo.id == photo_id, Photo.deleted_at.is_(None))
        )
        return result.scalar_one_or_none()

    async def list(
        self,
        project_id: uuid.UUID,
        offset: int = 0,
        limit: int = 20,
        category: str | None = None,
    ):
        q = select(Photo).where(
            Photo.project_id == project_id, Photo.deleted_at.is_(None)
        )
        if category:
            q = q.where(Photo.category == category)
        q = q.order_by(Photo.created_at.desc()).offset(offset).limit(limit)
        result = await self.db.execute(q)
        return result.scalars().all()

    async def count(self, project_id: uuid.UUID, category: str | None = None) -> int:
        q = (
            select(func.count())
            .select_from(Photo)
            .where(Photo.project_id == project_id, Photo.deleted_at.is_(None))
        )
        if category:
            q = q.where(Photo.category == category)
        result = await self.db.execute(q)
        return result.scalar_one()

    async def create(
        self,
        project_id: uuid.UUID,
        file_name: str,
        original_name: str,
        content_type: str,
        file_size: int,
        bucket_name: str,
        object_key: str,
        category: str,
        created_by: uuid.UUID,
        caption: str | None = None,
        daily_report_id: uuid.UUID | None = None,
    ) -> Photo:
        photo = Photo(
            project_id=project_id,
            file_name=file_name,
            original_name=original_name,
            content_type=content_type,
            file_size=file_size,
            bucket_name=bucket_name,
            object_key=object_key,
            category=category,
            caption=caption,
            daily_report_id=daily_report_id,
            created_by=created_by,
        )
        self.db.add(photo)
        await self.db.flush()
        await self.db.refresh(photo)
        return photo

    async def update(self, photo: Photo, data: PhotoUpdate) -> Photo:
        for field, value in data.model_dump(exclude_none=True).items():
            setattr(photo, field, value)
        await self.db.flush()
        await self.db.refresh(photo)
        return photo

    async def soft_delete(self, photo: Photo) -> None:
        photo.deleted_at = datetime.now(timezone.utc)
        await self.db.flush()
