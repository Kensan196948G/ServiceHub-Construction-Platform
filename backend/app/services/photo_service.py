"""
写真管理サービス（ビジネスロジック層）
アップロード・取得・更新・削除
"""

import uuid

import structlog
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import BadRequestError, NotFoundError, ServiceError
from app.repositories.photo import PhotoRepository
from app.schemas.photo import PhotoResponse, PhotoUpdate
from app.services.storage import storage_service

logger = structlog.get_logger()


class PhotoNotFoundError(NotFoundError):
    detail = "写真が見つかりません"


class InvalidFileTypeError(BadRequestError):
    detail = "無効なファイル形式です"


class FileTooLargeError(BadRequestError):
    detail = "ファイルサイズが上限を超えています"


class UploadFailedError(ServiceError):
    detail = "ファイルのアップロードに失敗しました"


class PhotoService:
    ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp", "application/pdf"}
    MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB

    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = PhotoRepository(db)
        self.storage = storage_service

    async def upload(
        self,
        project_id: uuid.UUID,
        file_data: bytes,
        filename: str,
        content_type: str | None,
        category: str,
        caption: str | None,
        daily_report_id: uuid.UUID | None,
        created_by: uuid.UUID,
    ) -> PhotoResponse:
        """Upload a photo/document to storage and create DB record."""
        if content_type not in self.ALLOWED_TYPES:
            raise InvalidFileTypeError(f"許可されていないファイル形式: {content_type}")

        if len(file_data) > self.MAX_FILE_SIZE:
            raise FileTooLargeError("ファイルサイズが50MBを超えています")

        object_key = self.storage.generate_object_key(
            str(project_id), category, filename
        )

        try:
            self.storage.upload_file(
                file_data, object_key, content_type or "application/octet-stream"
            )
        except Exception as err:
            logger.error("upload_failed", object_key=object_key, error=str(err))
            raise UploadFailedError("ファイルアップロードに失敗しました") from err

        photo = await self.repo.create(
            project_id=project_id,
            file_name=object_key.split("/")[-1],
            original_name=filename,
            content_type=content_type or "application/octet-stream",
            file_size=len(file_data),
            bucket_name=self.storage.bucket,
            object_key=object_key,
            category=category,
            caption=caption,
            daily_report_id=daily_report_id,
            created_by=created_by,
        )

        response_data = PhotoResponse.model_validate(photo)
        try:
            response_data.download_url = self.storage.get_presigned_url(object_key)
        except Exception:
            logger.debug("presigned_url_generation_failed", object_key=object_key)

        return response_data

    async def list_photos(
        self,
        project_id: uuid.UUID,
        page: int,
        per_page: int,
        category: str | None = None,
    ) -> tuple[list[PhotoResponse], int]:
        """Return paginated photo list with total count."""
        offset = (page - 1) * per_page
        photos = await self.repo.list(
            project_id, offset=offset, limit=per_page, category=category
        )
        total = await self.repo.count(project_id, category=category)
        return [PhotoResponse.model_validate(p) for p in photos], total

    async def get_photo(self, photo_id: uuid.UUID) -> PhotoResponse:
        """Get a single photo with presigned URL."""
        photo = await self.repo.get_by_id(photo_id)
        if not photo:
            raise PhotoNotFoundError("写真が見つかりません")

        response_data = PhotoResponse.model_validate(photo)
        try:
            response_data.download_url = self.storage.get_presigned_url(
                photo.object_key
            )
        except Exception:
            logger.debug("presigned_url_generation_failed", object_key=photo.object_key)

        return response_data

    async def update_photo(
        self, photo_id: uuid.UUID, data: PhotoUpdate
    ) -> PhotoResponse:
        """Update photo metadata."""
        photo = await self.repo.get_by_id(photo_id)
        if not photo:
            raise PhotoNotFoundError("写真が見つかりません")

        photo = await self.repo.update(photo, data)
        return PhotoResponse.model_validate(photo)

    async def delete_photo(self, photo_id: uuid.UUID) -> None:
        """Soft-delete photo and attempt storage cleanup."""
        photo = await self.repo.get_by_id(photo_id)
        if not photo:
            raise PhotoNotFoundError("写真が見つかりません")

        try:
            self.storage.delete_file(photo.object_key)
        except Exception:
            logger.warning("storage_delete_failed", object_key=photo.object_key)

        await self.repo.soft_delete(photo)
