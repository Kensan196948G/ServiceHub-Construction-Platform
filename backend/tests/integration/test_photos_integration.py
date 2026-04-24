"""写真・資料管理 統合テスト — アップロード・一覧・権限を DB経由で検証"""

from __future__ import annotations

import uuid
from io import BytesIO
from unittest.mock import patch

import pytest
from httpx import AsyncClient


def _project_payload(suffix: str = "001") -> dict:
    return {
        "name": f"写真テスト工事{suffix}",
        "project_code": f"PHOTO-PRJ-{suffix}",
        "description": "統合テスト用",
        "status": "IN_PROGRESS",
        "budget": 10000000.0,
        "start_date": "2026-04-01",
        "end_date": "2026-09-30",
        "location": "大阪府",
        "client_name": "写真テスト施主",
    }


def _mock_storage(project_id: str, filename: str = "test.jpg"):
    """MinIO storage_service モックを返す context manager"""
    return patch(
        "app.services.photo_service.storage_service",
        **{
            "bucket": "test-bucket",
            "generate_object_key.return_value": (
                f"projects/{project_id}/GENERAL/{filename}"
            ),
            "upload_file.return_value": None,
            "get_presigned_url.return_value": "http://minio-test/presigned/test.jpg",
        },
    )


@pytest.mark.asyncio
async def test_photo_upload_and_list_lifecycle(
    auth_client: AsyncClient, admin_headers: dict
):
    """写真アップロード → 一覧確認のライフサイクルテスト"""
    # 1. 案件作成
    prj_resp = await auth_client.post(
        "/api/v1/projects/", json=_project_payload("P01"), headers=admin_headers
    )
    assert prj_resp.status_code == 201
    project_id = prj_resp.json()["data"]["id"]

    # 2. 写真アップロード（ストレージモック）
    with _mock_storage(project_id):
        upload_resp = await auth_client.post(
            f"/api/v1/projects/{project_id}/photos",
            headers=admin_headers,
            files={"file": ("test.jpg", BytesIO(b"fake jpeg data"), "image/jpeg")},
            data={"category": "GENERAL", "caption": "現場写真1"},
        )

    assert upload_resp.status_code == 201
    photo = upload_resp.json()["data"]
    assert photo["category"] == "GENERAL"
    assert photo["caption"] == "現場写真1"
    assert photo["content_type"] == "image/jpeg"
    photo_id = photo["id"]

    # 3. 一覧確認
    list_resp = await auth_client.get(
        f"/api/v1/projects/{project_id}/photos",
        headers=admin_headers,
    )
    assert list_resp.status_code == 200
    items = list_resp.json()["data"]
    assert any(p["id"] == photo_id for p in items)


@pytest.mark.asyncio
async def test_photo_upload_multiple_categories(
    auth_client: AsyncClient, admin_headers: dict
):
    """複数カテゴリへ写真アップロードし、それぞれ一覧できる"""
    prj_resp = await auth_client.post(
        "/api/v1/projects/", json=_project_payload("P02"), headers=admin_headers
    )
    project_id = prj_resp.json()["data"]["id"]

    categories = ["GENERAL", "PROGRESS", "COMPLETION"]
    uploaded_ids = []
    for i, cat in enumerate(categories):
        with _mock_storage(project_id, f"photo_{i}.jpg"):
            resp = await auth_client.post(
                f"/api/v1/projects/{project_id}/photos",
                headers=admin_headers,
                files={
                    "file": (
                        f"photo_{i}.jpg",
                        BytesIO(b"data"),
                        "image/jpeg",
                    )
                },
                data={"category": cat},
            )
        assert resp.status_code == 201
        uploaded_ids.append(resp.json()["data"]["id"])

    list_resp = await auth_client.get(
        f"/api/v1/projects/{project_id}/photos",
        headers=admin_headers,
    )
    assert list_resp.status_code == 200
    assert list_resp.json()["meta"]["total"] == 3


@pytest.mark.asyncio
async def test_photo_upload_viewer_cannot_upload(
    auth_client: AsyncClient, viewer_headers: dict
):
    """VIEWER ロールは写真アップロード不可"""
    project_id = str(uuid.uuid4())
    resp = await auth_client.post(
        f"/api/v1/projects/{project_id}/photos",
        headers=viewer_headers,
        files={"file": ("test.jpg", BytesIO(b"data"), "image/jpeg")},
        data={"category": "GENERAL"},
    )
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_photo_upload_invalid_content_type(
    auth_client: AsyncClient, admin_headers: dict
):
    """非許可ファイル形式（exe）は 400"""
    prj_resp = await auth_client.post(
        "/api/v1/projects/", json=_project_payload("P03"), headers=admin_headers
    )
    project_id = prj_resp.json()["data"]["id"]

    resp = await auth_client.post(
        f"/api/v1/projects/{project_id}/photos",
        headers=admin_headers,
        files={"file": ("malware.exe", BytesIO(b"binary"), "application/octet-stream")},
        data={"category": "GENERAL"},
    )
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_photo_get_detail_after_upload(
    auth_client: AsyncClient, admin_headers: dict
):
    """アップロード後に個別取得でメタデータと署名済み URL が返る"""
    prj_resp = await auth_client.post(
        "/api/v1/projects/", json=_project_payload("P04"), headers=admin_headers
    )
    project_id = prj_resp.json()["data"]["id"]

    with _mock_storage(project_id):
        upload_resp = await auth_client.post(
            f"/api/v1/projects/{project_id}/photos",
            headers=admin_headers,
            files={"file": ("detail.jpg", BytesIO(b"data"), "image/jpeg")},
            data={"category": "GENERAL", "caption": "詳細取得テスト"},
        )
    photo_id = upload_resp.json()["data"]["id"]

    # 個別取得
    with _mock_storage(project_id):
        get_resp = await auth_client.get(
            f"/api/v1/photos/{photo_id}",
            headers=admin_headers,
        )

    assert get_resp.status_code == 200
    detail = get_resp.json()["data"]
    assert detail["id"] == photo_id
    assert detail["caption"] == "詳細取得テスト"
