"""StorageService のユニットテスト (MinIO クライアントをモック)"""

from __future__ import annotations

import re
from datetime import timedelta
from unittest.mock import MagicMock, patch

import pytest
from minio.error import S3Error

# ---------------------------------------------------------------------------
# Fixture: MinIO クライアントをモックした StorageService
# ---------------------------------------------------------------------------


@pytest.fixture
def storage_service():
    """Minio() コンストラクタをモックして StorageService を生成"""
    with patch("app.services.storage.Minio") as mock_minio_cls:
        mock_client = MagicMock()
        mock_minio_cls.return_value = mock_client

        from app.services.storage import StorageService

        svc = StorageService()

        # テストから mock_client にアクセスできるよう属性として保持
        svc._mock_client = mock_client
        yield svc


def _make_s3_error(code: str = "NoSuchBucket", message: str = "test error") -> S3Error:
    """テスト用 S3Error を生成するヘルパー"""
    return S3Error(
        code=code,
        message=message,
        resource="/test",
        request_id="req-1",
        host_id="host-1",
        response=None,
    )


# ===========================================================================
# 1-3. ensure_bucket
# ===========================================================================


class TestEnsureBucket:
    """ensure_bucket のテスト"""

    @pytest.mark.asyncio
    async def test_creates_bucket_when_not_exists(self, storage_service):
        """バケットが存在しない場合は make_bucket を呼ぶ"""
        storage_service._mock_client.bucket_exists.return_value = False

        await storage_service.ensure_bucket()

        storage_service._mock_client.bucket_exists.assert_called_once_with(
            storage_service.bucket,
        )
        storage_service._mock_client.make_bucket.assert_called_once_with(
            storage_service.bucket,
        )

    @pytest.mark.asyncio
    async def test_skips_creation_when_already_exists(self, storage_service):
        """バケットが既に存在する場合は make_bucket を呼ばない"""
        storage_service._mock_client.bucket_exists.return_value = True

        await storage_service.ensure_bucket()

        storage_service._mock_client.bucket_exists.assert_called_once()
        storage_service._mock_client.make_bucket.assert_not_called()

    @pytest.mark.asyncio
    async def test_propagates_s3_error(self, storage_service):
        """S3Error が発生した場合はそのまま伝播する"""
        storage_service._mock_client.bucket_exists.side_effect = _make_s3_error()

        with pytest.raises(S3Error):
            await storage_service.ensure_bucket()


# ===========================================================================
# 4-5. upload_file
# ===========================================================================


class TestUploadFile:
    """upload_file のテスト"""

    def test_upload_returns_object_key(self, storage_service):
        """正常アップロード時に object_key を返す"""
        file_data = b"hello world"
        object_key = "projects/p1/docs/abc_test.txt"

        result = storage_service.upload_file(
            file_data,
            object_key,
            content_type="text/plain",
        )

        assert result == object_key
        storage_service._mock_client.put_object.assert_called_once()
        call_kwargs = storage_service._mock_client.put_object.call_args
        assert call_kwargs.kwargs["bucket_name"] == storage_service.bucket
        assert call_kwargs.kwargs["object_name"] == object_key
        assert call_kwargs.kwargs["length"] == len(file_data)
        assert call_kwargs.kwargs["content_type"] == "text/plain"

    def test_upload_raises_on_s3_error(self, storage_service):
        """S3Error 時は例外が伝播する"""
        storage_service._mock_client.put_object.side_effect = _make_s3_error(
            code="AccessDenied",
        )

        with pytest.raises(S3Error):
            storage_service.upload_file(b"data", "key")


# ===========================================================================
# 6-7. get_presigned_url
# ===========================================================================


class TestGetPresignedUrl:
    """get_presigned_url のテスト"""

    def test_returns_presigned_url(self, storage_service):
        """正常時にプリサインドURLを返す"""
        expected_url = "https://minio.example.com/bucket/obj?signature=xxx"
        storage_service._mock_client.presigned_get_object.return_value = expected_url

        result = storage_service.get_presigned_url("obj/key", expires=7200)

        assert result == expected_url
        storage_service._mock_client.presigned_get_object.assert_called_once_with(
            bucket_name=storage_service.bucket,
            object_name="obj/key",
            expires=timedelta(seconds=7200),
        )

    def test_raises_on_s3_error(self, storage_service):
        """S3Error 時は例外が伝播する"""
        storage_service._mock_client.presigned_get_object.side_effect = _make_s3_error()

        with pytest.raises(S3Error):
            storage_service.get_presigned_url("obj/key")


# ===========================================================================
# 8-9. delete_file
# ===========================================================================


class TestDeleteFile:
    """delete_file のテスト"""

    def test_delete_calls_remove_object(self, storage_service):
        """正常削除時に remove_object を呼ぶ"""
        storage_service.delete_file("projects/p1/docs/file.pdf")

        storage_service._mock_client.remove_object.assert_called_once_with(
            storage_service.bucket,
            "projects/p1/docs/file.pdf",
        )

    def test_delete_raises_on_s3_error(self, storage_service):
        """S3Error 時は例外が伝播する"""
        storage_service._mock_client.remove_object.side_effect = _make_s3_error()

        with pytest.raises(S3Error):
            storage_service.delete_file("obj/key")


# ===========================================================================
# 10. generate_object_key
# ===========================================================================


class TestGenerateObjectKey:
    """generate_object_key のテスト"""

    def test_key_format(self):
        """生成キーが projects/{id}/{category}/{uuid8}_{safe_name} 形式"""
        from app.services.storage import StorageService

        key = StorageService.generate_object_key(
            project_id="proj-123",
            category="drawings",
            filename="floor plan.dwg",
        )

        # Format: projects/proj-123/drawings/{8hex}_floor_plan.dwg
        pattern = r"^projects/proj-123/drawings/[0-9a-f]{8}_floor_plan\.dwg$"
        assert re.match(pattern, key), f"Key format mismatch: {key}"

    def test_spaces_replaced_with_underscores(self):
        """ファイル名のスペースがアンダースコアに置換される"""
        from app.services.storage import StorageService

        key = StorageService.generate_object_key("p1", "cat", "my file name.txt")
        filename_part = key.split("/")[-1]
        # uuid8 + _ + safe_name
        assert " " not in filename_part
        assert "my_file_name.txt" in filename_part

    def test_unique_keys_generated(self):
        """同一引数でも異なるキーが生成される (UUID部分)"""
        from app.services.storage import StorageService

        key1 = StorageService.generate_object_key("p1", "docs", "file.txt")
        key2 = StorageService.generate_object_key("p1", "docs", "file.txt")
        assert key1 != key2
