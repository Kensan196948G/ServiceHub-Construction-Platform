"""SafetyService のユニットテスト"""

import uuid

import pytest


@pytest.mark.asyncio
async def test_safety_check_create_and_list(auth_client, admin_headers):
    """安全チェックの作成と一覧"""
    project_resp = await auth_client.post(
        "/api/v1/projects",
        json={
            "project_code": f"SAF-{uuid.uuid4().hex[:6]}",
            "name": "Safety Test",
            "client_name": "Client",
            "status": "ACTIVE",
        },
        headers=admin_headers,
    )
    project_id = project_resp.json()["data"]["id"]

    resp = await auth_client.post(
        f"/api/v1/projects/{project_id}/safety-checks",
        json={
            "project_id": project_id,
            "check_date": "2026-04-04",
            "check_type": "日次",
            "items_total": 10,
            "items_ok": 9,
            "items_ng": 1,
            "overall_result": "PASS",
        },
        headers=admin_headers,
    )
    assert resp.status_code == 201

    list_resp = await auth_client.get(
        f"/api/v1/projects/{project_id}/safety-checks",
        headers=admin_headers,
    )
    assert list_resp.status_code == 200
    assert list_resp.json()["meta"]["total"] >= 1


@pytest.mark.asyncio
async def test_safety_check_delete(auth_client, admin_headers):
    """安全チェックの削除"""
    project_resp = await auth_client.post(
        "/api/v1/projects",
        json={
            "project_code": f"SAFD-{uuid.uuid4().hex[:6]}",
            "name": "Del Test",
            "client_name": "Client",
            "status": "ACTIVE",
        },
        headers=admin_headers,
    )
    project_id = project_resp.json()["data"]["id"]

    create_resp = await auth_client.post(
        f"/api/v1/projects/{project_id}/safety-checks",
        json={
            "project_id": project_id,
            "check_date": "2026-04-04",
            "check_type": "日次",
        },
        headers=admin_headers,
    )
    check_id = create_resp.json()["data"]["id"]

    del_resp = await auth_client.delete(
        f"/api/v1/projects/{project_id}/safety-checks/{check_id}",
        headers=admin_headers,
    )
    assert del_resp.status_code == 204


@pytest.mark.asyncio
async def test_safety_check_delete_not_found(auth_client, admin_headers):
    """存在しない安全チェックの削除は404"""
    project_id = uuid.uuid4()
    resp = await auth_client.delete(
        f"/api/v1/projects/{project_id}/safety-checks/{uuid.uuid4()}",
        headers=admin_headers,
    )
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_quality_inspection_create(auth_client, admin_headers):
    """品質検査の作成"""
    project_resp = await auth_client.post(
        "/api/v1/projects",
        json={
            "project_code": f"QI-{uuid.uuid4().hex[:6]}",
            "name": "QI Test",
            "client_name": "Client",
            "status": "ACTIVE",
        },
        headers=admin_headers,
    )
    project_id = project_resp.json()["data"]["id"]

    resp = await auth_client.post(
        f"/api/v1/projects/{project_id}/quality-inspections",
        json={
            "project_id": project_id,
            "inspection_date": "2026-04-04",
            "inspection_type": "出来形",
            "target_item": "基礎コンクリート",
            "result": "PASS",
        },
        headers=admin_headers,
    )
    assert resp.status_code == 201
    assert resp.json()["data"]["result"] == "PASS"
