"""写真・資料管理APIテスト（ストレージモック使用）"""

import uuid
from io import BytesIO
from unittest.mock import MagicMock, patch

import pytest


# ---------------------------------------------------------------------------
# 認証なし
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_list_photos_unauthorized(client):
    """未認証で写真一覧は401"""
    project_id = str(uuid.uuid4())
    resp = await client.get(f"/api/v1/projects/{project_id}/photos")
    assert resp.status_code in (401, 403)


@pytest.mark.asyncio
async def test_get_photo_unauthorized(client):
    """未認証で写真詳細は401"""
    photo_id = str(uuid.uuid4())
    resp = await client.get(f"/api/v1/photos/{photo_id}")
    assert resp.status_code in (401, 403)


@pytest.mark.asyncio
async def test_upload_photo_unauthorized(client):
    """未認証で写真アップロードは401"""
    project_id = str(uuid.uuid4())
    resp = await client.post(
        f"/api/v1/projects/{project_id}/photos",
        files={"file": ("test.jpg", BytesIO(b"data"), "image/jpeg")},
    )
    assert resp.status_code in (401, 403)


# ---------------------------------------------------------------------------
# 写真アップロード
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_upload_photo_success(auth_client, admin_headers):
    """写真アップロード - 正常"""
    project_id = str(uuid.uuid4())
    fake_key = f"projects/{project_id}/GENERAL/abc_test.jpg"

    with patch("app.api.v1.routers.photos.storage_service") as mock_storage:
        mock_storage.bucket = "test-bucket"
        mock_storage.generate_object_key.return_value = fake_key
        mock_storage.upload_file.return_value = None
        mock_storage.get_presigned_url.return_value = "http://minio/presigned"

        resp = await auth_client.post(
            f"/api/v1/projects/{project_id}/photos",
            headers=admin_headers,
            files={"file": ("test.jpg", BytesIO(b"fake image data"), "image/jpeg")},
            data={"category": "GENERAL", "caption": "テスト写真"},
        )

    assert resp.status_code == 201
    data = resp.json()["data"]
    assert data["category"] == "GENERAL"
    assert data["content_type"] == "image/jpeg"


@pytest.mark.asyncio
async def test_upload_photo_invalid_content_type(auth_client, admin_headers):
    """写真アップロード - 非許可ファイル形式は400"""
    project_id = str(uuid.uuid4())
    resp = await auth_client.post(
        f"/api/v1/projects/{project_id}/photos",
        headers=admin_headers,
        files={"file": ("test.exe", BytesIO(b"binary data"), "application/x-msdownload")},
        data={"category": "GENERAL"},
    )
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_upload_photo_storage_failure(auth_client, admin_headers):
    """写真アップロード - ストレージ障害時は500"""
    project_id = str(uuid.uuid4())
    fake_key = f"projects/{project_id}/GENERAL/abc_test.jpg"

    with patch("app.api.v1.routers.photos.storage_service") as mock_storage:
        mock_storage.bucket = "test-bucket"
        mock_storage.generate_object_key.return_value = fake_key
        mock_storage.upload_file.side_effect = Exception("MinIO connection failed")

        resp = await auth_client.post(
            f"/api/v1/projects/{project_id}/photos",
            headers=admin_headers,
            files={"file": ("test.jpg", BytesIO(b"data"), "image/jpeg")},
            data={"category": "GENERAL"},
        )

    assert resp.status_code == 500


# ---------------------------------------------------------------------------
# 写真一覧・詳細・更新・削除
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_list_photos_empty(auth_client, admin_headers):
    """写真一覧 - 0件"""
    project_id = str(uuid.uuid4())
    resp = await auth_client.get(
        f"/api/v1/projects/{project_id}/photos",
        headers=admin_headers,
    )
    assert resp.status_code == 200
    assert resp.json()["meta"]["total"] == 0


@pytest.mark.asyncio
async def test_list_photos_with_data(auth_client, admin_headers):
    """写真一覧 - データあり"""
    project_id = str(uuid.uuid4())
    fake_key = f"projects/{project_id}/GENERAL/abc_photo.jpg"

    with patch("app.api.v1.routers.photos.storage_service") as mock_storage:
        mock_storage.bucket = "test-bucket"
        mock_storage.generate_object_key.return_value = fake_key
        mock_storage.upload_file.return_value = None
        mock_storage.get_presigned_url.return_value = "http://minio/url"

        await auth_client.post(
            f"/api/v1/projects/{project_id}/photos",
            headers=admin_headers,
            files={"file": ("photo.jpg", BytesIO(b"img"), "image/jpeg")},
            data={"category": "GENERAL"},
        )

    resp = await auth_client.get(
        f"/api/v1/projects/{project_id}/photos",
        headers=admin_headers,
    )
    assert resp.status_code == 200
    assert resp.json()["meta"]["total"] == 1


@pytest.mark.asyncio
async def test_list_photos_with_category_filter(auth_client, admin_headers):
    """写真一覧 - カテゴリフィルタ"""
    project_id = str(uuid.uuid4())
    fake_key = f"projects/{project_id}/PROGRESS/abc_photo.jpg"

    with patch("app.api.v1.routers.photos.storage_service") as mock_storage:
        mock_storage.bucket = "test-bucket"
        mock_storage.generate_object_key.return_value = fake_key
        mock_storage.upload_file.return_value = None
        mock_storage.get_presigned_url.return_value = "http://minio/url"

        await auth_client.post(
            f"/api/v1/projects/{project_id}/photos",
            headers=admin_headers,
            files={"file": ("photo.jpg", BytesIO(b"img"), "image/jpeg")},
            data={"category": "PROGRESS"},
        )

    resp = await auth_client.get(
        f"/api/v1/projects/{project_id}/photos?category=PROGRESS",
        headers=admin_headers,
    )
    assert resp.status_code == 200
    assert resp.json()["meta"]["total"] == 1


@pytest.mark.asyncio
async def test_get_photo_not_found(auth_client, admin_headers):
    """存在しない写真は404"""
    fake_id = str(uuid.uuid4())
    resp = await auth_client.get(
        f"/api/v1/photos/{fake_id}",
        headers=admin_headers,
    )
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_get_photo_success(auth_client, admin_headers):
    """写真詳細取得 - 正常"""
    project_id = str(uuid.uuid4())
    fake_key = f"projects/{project_id}/GENERAL/abc_photo.jpg"

    with patch("app.api.v1.routers.photos.storage_service") as mock_storage:
        mock_storage.bucket = "test-bucket"
        mock_storage.generate_object_key.return_value = fake_key
        mock_storage.upload_file.return_value = None
        mock_storage.get_presigned_url.return_value = "http://minio/presigned"

        create_resp = await auth_client.post(
            f"/api/v1/projects/{project_id}/photos",
            headers=admin_headers,
            files={"file": ("photo.jpg", BytesIO(b"img data"), "image/jpeg")},
            data={"category": "GENERAL"},
        )
    assert create_resp.status_code == 201
    photo_id = create_resp.json()["data"]["id"]

    with patch("app.api.v1.routers.photos.storage_service") as mock_storage:
        mock_storage.get_presigned_url.return_value = "http://minio/presigned-get"

        get_resp = await auth_client.get(
            f"/api/v1/photos/{photo_id}",
            headers=admin_headers,
        )
    assert get_resp.status_code == 200
    assert get_resp.json()["data"]["id"] == photo_id


@pytest.mark.asyncio
async def test_update_photo_not_found(auth_client, admin_headers):
    """存在しない写真の更新は404"""
    fake_id = str(uuid.uuid4())
    resp = await auth_client.put(
        f"/api/v1/photos/{fake_id}",
        json={"caption": "更新キャプション"},
        headers=admin_headers,
    )
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_update_photo_success(auth_client, admin_headers):
    """写真メタデータ更新 - 正常"""
    project_id = str(uuid.uuid4())
    fake_key = f"projects/{project_id}/GENERAL/abc_photo.jpg"

    with patch("app.api.v1.routers.photos.storage_service") as mock_storage:
        mock_storage.bucket = "test-bucket"
        mock_storage.generate_object_key.return_value = fake_key
        mock_storage.upload_file.return_value = None
        mock_storage.get_presigned_url.return_value = "http://minio/url"

        create_resp = await auth_client.post(
            f"/api/v1/projects/{project_id}/photos",
            headers=admin_headers,
            files={"file": ("photo.jpg", BytesIO(b"img"), "image/jpeg")},
            data={"category": "GENERAL"},
        )
    photo_id = create_resp.json()["data"]["id"]

    update_resp = await auth_client.put(
        f"/api/v1/photos/{photo_id}",
        json={"caption": "更新後キャプション", "category": "PROGRESS"},
        headers=admin_headers,
    )
    assert update_resp.status_code == 200
    updated = update_resp.json()["data"]
    assert updated["caption"] == "更新後キャプション"
    assert updated["category"] == "PROGRESS"


@pytest.mark.asyncio
async def test_delete_photo_not_found(auth_client, admin_headers):
    """存在しない写真の削除は404"""
    fake_id = str(uuid.uuid4())
    resp = await auth_client.delete(
        f"/api/v1/photos/{fake_id}",
        headers=admin_headers,
    )
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_delete_photo_success(auth_client, admin_headers):
    """写真削除（論理削除） - 正常"""
    project_id = str(uuid.uuid4())
    fake_key = f"projects/{project_id}/GENERAL/abc_photo.jpg"

    with patch("app.api.v1.routers.photos.storage_service") as mock_storage:
        mock_storage.bucket = "test-bucket"
        mock_storage.generate_object_key.return_value = fake_key
        mock_storage.upload_file.return_value = None
        mock_storage.get_presigned_url.return_value = "http://minio/url"

        create_resp = await auth_client.post(
            f"/api/v1/projects/{project_id}/photos",
            headers=admin_headers,
            files={"file": ("photo.jpg", BytesIO(b"img"), "image/jpeg")},
            data={"category": "GENERAL"},
        )
    photo_id = create_resp.json()["data"]["id"]

    with patch("app.api.v1.routers.photos.storage_service") as mock_storage:
        mock_storage.delete_file.return_value = None

        del_resp = await auth_client.delete(
            f"/api/v1/photos/{photo_id}",
            headers=admin_headers,
        )
    assert del_resp.status_code == 204

    # 削除後は404
    get_resp = await auth_client.get(
        f"/api/v1/photos/{photo_id}",
        headers=admin_headers,
    )
    assert get_resp.status_code == 404
