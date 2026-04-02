"""工事案件管理 統合テスト"""
from __future__ import annotations
import pytest
from httpx import AsyncClient
from tests.conftest import make_token
from app.core.rbac import UserRole


@pytest.mark.asyncio
async def test_projects_crud_lifecycle(client: AsyncClient, admin_headers: dict):
    """工事案件 CRUD ライフサイクルテスト"""
    # 1. 作成
    payload = {
        "name": "テスト工事案件",
        "project_code": "PRJ-TEST-001",
        "description": "統合テスト用案件",
        "status": "PLANNING",
        "budget": 10000000.0,
        "start_date": "2026-04-01",
        "end_date": "2026-09-30",
        "location": "東京都千代田区",
    }
    resp = await client.post("/api/v1/projects/", json=payload, headers=admin_headers)
    assert resp.status_code == 201, resp.text
    data = resp.json()
    assert data["data"]["name"] == "テスト工事案件"
    project_id = data["data"]["id"]

    # 2. 取得
    resp = await client.get(f"/api/v1/projects/{project_id}", headers=admin_headers)
    assert resp.status_code == 200
    assert resp.json()["data"]["project_code"] == "PRJ-TEST-001"

    # 3. 一覧
    resp = await client.get("/api/v1/projects/", headers=admin_headers)
    assert resp.status_code == 200
    assert resp.json()["total"] >= 1

    # 4. 更新
    resp = await client.patch(
        f"/api/v1/projects/{project_id}",
        json={"status": "IN_PROGRESS"},
        headers=admin_headers,
    )
    assert resp.status_code == 200
    assert resp.json()["data"]["status"] == "IN_PROGRESS"


@pytest.mark.asyncio
async def test_projects_viewer_cannot_create(client: AsyncClient, viewer_headers: dict):
    """VIEWERは案件作成不可"""
    resp = await client.post("/api/v1/projects/", json={
        "name": "VIEWER案件",
        "project_code": "PRJ-V-001",
        "description": "test",
        "status": "PLANNING",
    }, headers=viewer_headers)
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_projects_unauthenticated(client: AsyncClient):
    """未認証で401"""
    resp = await client.get("/api/v1/projects/")
    assert resp.status_code == 401
