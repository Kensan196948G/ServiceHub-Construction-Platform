"""ProjectService のユニットテスト"""

import uuid

import pytest


@pytest.mark.asyncio
async def test_project_crud(auth_client, admin_headers):
    """プロジェクトのCRUD全操作"""
    code = f"PRJ-{uuid.uuid4().hex[:6]}"

    # Create
    resp = await auth_client.post(
        "/api/v1/projects",
        json={
            "project_code": code,
            "name": "テストプロジェクト",
            "client_name": "テストクライアント",
            "status": "PLANNING",
        },
        headers=admin_headers,
    )
    assert resp.status_code == 201
    project = resp.json()["data"]
    project_id = project["id"]
    assert project["project_code"] == code

    # Get
    resp = await auth_client.get(
        f"/api/v1/projects/{project_id}", headers=admin_headers
    )
    assert resp.status_code == 200
    assert resp.json()["data"]["name"] == "テストプロジェクト"

    # Update
    resp = await auth_client.put(
        f"/api/v1/projects/{project_id}",
        json={"name": "更新済みプロジェクト", "status": "ACTIVE"},
        headers=admin_headers,
    )
    assert resp.status_code == 200
    assert resp.json()["data"]["name"] == "更新済みプロジェクト"

    # Delete
    resp = await auth_client.delete(
        f"/api/v1/projects/{project_id}", headers=admin_headers
    )
    assert resp.status_code == 204


@pytest.mark.asyncio
async def test_project_duplicate_code(auth_client, admin_headers):
    """案件コード重複は400エラー"""
    code = f"DUP-{uuid.uuid4().hex[:6]}"
    payload = {
        "project_code": code,
        "name": "First",
        "client_name": "Client",
        "status": "PLANNING",
    }

    resp1 = await auth_client.post(
        "/api/v1/projects", json=payload, headers=admin_headers
    )
    assert resp1.status_code == 201

    resp2 = await auth_client.post(
        "/api/v1/projects", json=payload, headers=admin_headers
    )
    assert resp2.status_code == 400


@pytest.mark.asyncio
async def test_project_not_found(auth_client, admin_headers):
    """存在しないプロジェクトは404"""
    fake_id = uuid.uuid4()
    resp = await auth_client.get(f"/api/v1/projects/{fake_id}", headers=admin_headers)
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_project_list_pagination(auth_client, admin_headers):
    """プロジェクト一覧のページネーション"""
    for i in range(3):
        await auth_client.post(
            "/api/v1/projects",
            json={
                "project_code": f"PAG-{uuid.uuid4().hex[:6]}",
                "name": f"Project {i}",
                "client_name": "Client",
                "status": "PLANNING",
            },
            headers=admin_headers,
        )

    resp = await auth_client.get(
        "/api/v1/projects?page=1&per_page=2", headers=admin_headers
    )
    assert resp.status_code == 200
    data = resp.json()
    assert len(data["data"]) <= 2
    assert data["meta"]["total"] >= 3
