"""
MinIOストレージサービス
ファイルアップロード・ダウンロード・プリサインドURL生成
"""
import uuid
import io
from datetime import timedelta
from typing import Optional

from minio import Minio
from minio.error import S3Error
import structlog

from app.core.config import settings

logger = structlog.get_logger()


class StorageService:
    """MinIOオブジェクトストレージサービス"""

    def __init__(self):
        self.client = Minio(
            endpoint=settings.MINIO_ENDPOINT,
            access_key=settings.MINIO_ACCESS_KEY,
            secret_key=settings.MINIO_SECRET_KEY,
            secure=False,
        )
        self.bucket = settings.MINIO_BUCKET

    async def ensure_bucket(self) -> None:
        """バケットが存在しない場合は作成"""
        try:
            if not self.client.bucket_exists(self.bucket):
                self.client.make_bucket(self.bucket)
                logger.info("bucket_created", bucket=self.bucket)
        except S3Error as e:
            logger.error("bucket_ensure_failed", error=str(e))
            raise

    def upload_file(
        self,
        file_data: bytes,
        object_key: str,
        content_type: str = "application/octet-stream",
    ) -> str:
        """ファイルをMinIOにアップロード"""
        try:
            self.client.put_object(
                bucket_name=self.bucket,
                object_name=object_key,
                data=io.BytesIO(file_data),
                length=len(file_data),
                content_type=content_type,
            )
            logger.info("file_uploaded", key=object_key, size=len(file_data))
            return object_key
        except S3Error as e:
            logger.error("upload_failed", key=object_key, error=str(e))
            raise

    def get_presigned_url(self, object_key: str, expires: int = 3600) -> str:
        """プリサインドダウンロードURL生成（デフォルト1時間有効）"""
        try:
            url = self.client.presigned_get_object(
                bucket_name=self.bucket,
                object_name=object_key,
                expires=timedelta(seconds=expires),
            )
            return url
        except S3Error as e:
            logger.error("presigned_url_failed", key=object_key, error=str(e))
            raise

    def delete_file(self, object_key: str) -> None:
        """ファイル削除"""
        try:
            self.client.remove_object(self.bucket, object_key)
            logger.info("file_deleted", key=object_key)
        except S3Error as e:
            logger.error("delete_failed", key=object_key, error=str(e))
            raise

    @staticmethod
    def generate_object_key(project_id: str, category: str, filename: str) -> str:
        """オブジェクトキー生成: projects/{id}/{category}/{uuid}_{filename}"""
        unique_id = str(uuid.uuid4())[:8]
        safe_name = filename.replace(" ", "_")
        return f"projects/{project_id}/{category}/{unique_id}_{safe_name}"


# シングルトン
storage_service = StorageService()
