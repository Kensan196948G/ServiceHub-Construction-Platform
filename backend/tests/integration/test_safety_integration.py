"""安全・品質管理 統合テスト — SafetyCheck + QualityInspection CRUD を DB経由で検証"""

from __future__ import annotations

import uuid

import pytest
from httpx import AsyncClient


def _project_payload(suffix: str = "001") -> dict:
    return {
        "name": f"安全テスト工事{suffix}",
        "project_code": f"SAFE-PRJ-{suffix}",
        "description": "統合テスト用",
        "status": "IN_PROGRESS",
        "budget": 20000000.0,
        "start_date": "2026-04-01",
        "end_date": "2026-09-30",
        "location": "神奈川県",
        "client_name": "安全テスト施主",
    }


@pytest.mark.asyncio
async def test_safety_check_lifecycle(auth_client: AsyncClient, admin_headers: dict):
    """安全点検 CRUD ライフサイクルテスト"""
    # 1. 案件作成
    prj_resp = await auth_client.post(
        "/api/v1/projects/", json=_project_payload("S01"), headers=admin_headers
    )
    assert prj_resp.status_code == 201
    project_id = prj_resp.json()["data"]["id"]

    # 2. 安全点検作成
    payload = {
        "project_id": project_id,
        "check_date": "2026-05-10",
        "check_type": "DAILY",
        "items_total": 12,
        "items_ok": 11,
        "items_ng": 1,
        "overall_result": "NG",
        "notes": "安全帯未装着1名",
    }
    create_resp = await auth_client.post(
        f"/api/v1/projects/{project_id}/safety-checks",
        json=payload,
        headers=admin_headers,
    )
    assert create_resp.status_code == 201
    check = create_resp.json()["data"]
    assert check["check_type"] == "DAILY"
    assert check["items_ng"] == 1
    assert check["overall_result"] == "NG"
    check_id = check["id"]

    # 3. 一覧確認（個別 GET エンドポイントは未実装のため一覧で検証）
    list_resp = await auth_client.get(
        f"/api/v1/projects/{project_id}/safety-checks",
        headers=admin_headers,
    )
    assert list_resp.status_code == 200
    items = list_resp.json()["data"]
    assert list_resp.json()["meta"]["total"] >= 1
    assert any(c["id"] == check_id for c in items)


@pytest.mark.asyncio
async def test_safety_check_all_ok(auth_client: AsyncClient, pm_headers: dict):
    """全点検項目 OK の安全点検を作成できる"""
    prj_resp = await auth_client.post(
        "/api/v1/projects/", json=_project_payload("S02"), headers=pm_headers
    )
    assert prj_resp.status_code == 201
    project_id = prj_resp.json()["data"]["id"]

    resp = await auth_client.post(
        f"/api/v1/projects/{project_id}/safety-checks",
        json={
            "project_id": project_id,
            "check_date": "2026-05-11",
            "check_type": "WEEKLY",
            "items_total": 20,
            "items_ok": 20,
            "items_ng": 0,
            "overall_result": "OK",
        },
        headers=pm_headers,
    )
    assert resp.status_code == 201
    assert resp.json()["data"]["overall_result"] == "OK"


@pytest.mark.asyncio
async def test_quality_inspection_lifecycle(
    auth_client: AsyncClient, admin_headers: dict
):
    """品質検査 CRUD ライフサイクルテスト"""
    prj_resp = await auth_client.post(
        "/api/v1/projects/", json=_project_payload("S03"), headers=admin_headers
    )
    project_id = prj_resp.json()["data"]["id"]

    # 1. 品質検査作成
    qi_payload = {
        "project_id": project_id,
        "inspection_date": "2026-05-15",
        "inspection_type": "CONCRETE",
        "target_item": "スランプ試験",
        "standard_value": "12±2.5cm",
        "measured_value": "13cm",
        "result": "PASS",
        "remarks": "規格内",
    }
    create_resp = await auth_client.post(
        f"/api/v1/projects/{project_id}/quality-inspections",
        json=qi_payload,
        headers=admin_headers,
    )
    assert create_resp.status_code == 201
    qi = create_resp.json()["data"]
    assert qi["inspection_type"] == "CONCRETE"
    assert qi["result"] == "PASS"
    qi_id = qi["id"]

    # 2. 一覧確認
    list_resp = await auth_client.get(
        f"/api/v1/projects/{project_id}/quality-inspections",
        headers=admin_headers,
    )
    assert list_resp.status_code == 200
    items = list_resp.json()["data"]
    assert any(i["id"] == qi_id for i in items)


@pytest.mark.asyncio
async def test_safety_check_viewer_cannot_create(
    auth_client: AsyncClient, viewer_headers: dict
):
    """VIEWER ロールは安全点検作成不可"""
    project_id = str(uuid.uuid4())
    resp = await auth_client.post(
        f"/api/v1/projects/{project_id}/safety-checks",
        json={
            "project_id": project_id,
            "check_date": "2026-05-10",
            "check_type": "DAILY",
            "items_total": 5,
            "items_ok": 5,
            "items_ng": 0,
            "overall_result": "OK",
        },
        headers=viewer_headers,
    )
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_safety_check_delete_not_found(
    auth_client: AsyncClient, admin_headers: dict
):
    """存在しない安全点検 ID の削除は 404"""
    fake_project_id = str(uuid.uuid4())
    fake_check_id = str(uuid.uuid4())
    resp = await auth_client.delete(
        f"/api/v1/projects/{fake_project_id}/safety-checks/{fake_check_id}",
        headers=admin_headers,
    )
    assert resp.status_code == 404
