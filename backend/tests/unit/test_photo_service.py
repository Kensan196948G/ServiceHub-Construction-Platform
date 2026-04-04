"""PhotoService のユニットテスト（モックベース）"""

import uuid
from datetime import datetime
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.services.photo_service import (
    FileTooLargeError,
    InvalidFileTypeError,
    PhotoNotFoundError,
    PhotoService,
    UploadFailedError,
)

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _make_photo_row(**overrides):
    """PhotoRepository が返すモデルオブジェクトの代替."""
    defaults = {
        "id": uuid.uuid4(),
        "project_id": uuid.uuid4(),
        "daily_report_id": None,
        "file_name": "abc123_photo.jpg",
        "original_name": "photo.jpg",
        "content_type": "image/jpeg",
        "file_size": 1024,
        "bucket_name": "test-bucket",
        "object_key": "projects/pid/photos/abc123_photo.jpg",
        "category": "photos",
        "caption": None,
        "taken_at": None,
        "created_at": datetime(2026, 1, 1),
    }
    defaults.update(overrides)
    row = MagicMock()
    for k, v in defaults.items():
        setattr(row, k, v)
    # PhotoResponse.model_validate(from_attributes=True) reads download_url;
    # MagicMock auto-creates it as a MagicMock, which Pydantic rejects.
    row.download_url = None
    return row


def _build_service():
    """モック済みの PhotoService を構築."""
    db = MagicMock()
    with (
        patch("app.services.photo_service.PhotoRepository") as repo_cls,
        patch("app.services.photo_service.storage_service") as mock_storage,
    ):
        svc = PhotoService(db)
        svc.repo = repo_cls.return_value
        svc.storage = mock_storage
        mock_storage.bucket = "test-bucket"
    return svc


# ---------------------------------------------------------------------------
# upload: FileTooLargeError (line 59)
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_upload_file_too_large():
    """50MB超のファイルは FileTooLargeError."""
    svc = _build_service()
    big_data = b"x" * (50 * 1024 * 1024 + 1)

    with pytest.raises(FileTooLargeError):
        await svc.upload(
            project_id=uuid.uuid4(),
            file_data=big_data,
            filename="big.jpg",
            content_type="image/jpeg",
            category="photos",
            caption=None,
            daily_report_id=None,
            created_by=uuid.uuid4(),
        )


# ---------------------------------------------------------------------------
# upload: InvalidFileTypeError
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_upload_invalid_file_type():
    """許可されていないファイル形式は InvalidFileTypeError."""
    svc = _build_service()

    with pytest.raises(InvalidFileTypeError):
        await svc.upload(
            project_id=uuid.uuid4(),
            file_data=b"data",
            filename="script.exe",
            content_type="application/x-msdownload",
            category="photos",
            caption=None,
            daily_report_id=None,
            created_by=uuid.uuid4(),
        )


# ---------------------------------------------------------------------------
# upload: UploadFailedError (storage 失敗)
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_upload_storage_failure():
    """storage.upload_file が例外を投げると UploadFailedError."""
    svc = _build_service()
    svc.storage.generate_object_key.return_value = "projects/p/photos/f.jpg"
    svc.storage.upload_file.side_effect = RuntimeError("S3 down")

    with pytest.raises(UploadFailedError):
        await svc.upload(
            project_id=uuid.uuid4(),
            file_data=b"jpeg-bytes",
            filename="f.jpg",
            content_type="image/jpeg",
            category="photos",
            caption=None,
            daily_report_id=None,
            created_by=uuid.uuid4(),
        )


# ---------------------------------------------------------------------------
# upload: presigned URL 生成失敗でもレスポンスは返る (lines 90-91)
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_upload_presigned_url_failure_still_returns():
    """presigned URL 生成が失敗してもアップロード結果は返る."""
    svc = _build_service()
    photo_row = _make_photo_row()
    svc.storage.generate_object_key.return_value = photo_row.object_key
    svc.repo.create = AsyncMock(return_value=photo_row)
    svc.storage.get_presigned_url.side_effect = RuntimeError("URL gen failed")

    result = await svc.upload(
        project_id=photo_row.project_id,
        file_data=b"jpeg-bytes",
        filename="photo.jpg",
        content_type="image/jpeg",
        category="photos",
        caption=None,
        daily_report_id=None,
        created_by=uuid.uuid4(),
    )

    assert result.id == photo_row.id
    assert result.download_url is None


# ---------------------------------------------------------------------------
# get_photo: presigned URL 生成失敗でもレスポンスは返る (lines 121-122)
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_get_photo_presigned_url_failure_still_returns():
    """get_photo で presigned URL 生成が失敗しても結果は返る."""
    svc = _build_service()
    photo_row = _make_photo_row()
    svc.repo.get_by_id = AsyncMock(return_value=photo_row)
    svc.storage.get_presigned_url.side_effect = RuntimeError("URL gen failed")

    result = await svc.get_photo(photo_row.id)

    assert result.id == photo_row.id
    assert result.download_url is None


# ---------------------------------------------------------------------------
# get_photo: PhotoNotFoundError
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_get_photo_not_found():
    """存在しない photo_id は PhotoNotFoundError."""
    svc = _build_service()
    svc.repo.get_by_id = AsyncMock(return_value=None)

    with pytest.raises(PhotoNotFoundError):
        await svc.get_photo(uuid.uuid4())


# ---------------------------------------------------------------------------
# delete_photo: storage 削除失敗でも soft_delete 成功 (lines 145-146)
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_delete_photo_storage_failure_still_soft_deletes():
    """storage.delete_file が失敗しても soft_delete は実行される."""
    svc = _build_service()
    photo_row = _make_photo_row()
    svc.repo.get_by_id = AsyncMock(return_value=photo_row)
    svc.storage.delete_file.side_effect = RuntimeError("S3 delete failed")
    svc.repo.soft_delete = AsyncMock()

    await svc.delete_photo(photo_row.id)

    svc.repo.soft_delete.assert_awaited_once_with(photo_row)


# ---------------------------------------------------------------------------
# delete_photo: PhotoNotFoundError
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_delete_photo_not_found():
    """存在しない photo_id の削除は PhotoNotFoundError."""
    svc = _build_service()
    svc.repo.get_by_id = AsyncMock(return_value=None)

    with pytest.raises(PhotoNotFoundError):
        await svc.delete_photo(uuid.uuid4())
