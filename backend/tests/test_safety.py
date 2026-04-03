"""安全・品質管理APIテスト"""

import uuid

import pytest

# ---------------------------------------------------------------------------
# 認証なし
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_create_safety_check_unauthorized(client):
    """未認証で安全点検作成は401"""
    project_id = str(uuid.uuid4())
    resp = await client.post(
        f"/api/v1/projects/{project_id}/safety-checks",
        json={
            "project_id": project_id,
            "check_date": "2024-01-15",
        },
    )
    assert resp.status_code in (401, 403)


@pytest.mark.asyncio
async def test_list_safety_checks_unauthorized(client):
    """未認証で安全点検一覧は401"""
    project_id = str(uuid.uuid4())
    resp = await client.get(f"/api/v1/projects/{project_id}/safety-checks")
    assert resp.status_code in (401, 403)


# ---------------------------------------------------------------------------
# 安全点検 CRUD
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_create_safety_check(auth_client, admin_headers):
    """安全点検作成 - 正常"""
    project_id = str(uuid.uuid4())
    resp = await auth_client.post(
        f"/api/v1/projects/{project_id}/safety-checks",
        json={
            "project_id": project_id,
            "check_date": "2024-01-15",
            "check_type": "DAILY",
            "items_total": 10,
            "items_ok": 9,
            "items_ng": 1,
            "overall_result": "NG",
            "notes": "ヘルメット未着用1名",
        },
        headers=admin_headers,
    )
    assert resp.status_code == 201
    data = resp.json()["data"]
    assert data["check_type"] == "DAILY"
    assert data["items_total"] == 10
    assert data["items_ng"] == 1
    assert data["overall_result"] == "NG"


@pytest.mark.asyncio
async def test_list_safety_checks(auth_client, admin_headers):
    """安全点検一覧取得"""
    project_id = str(uuid.uuid4())
    # 2件作成
    for d in ["2024-01-15", "2024-01-16"]:
        await auth_client.post(
            f"/api/v1/projects/{project_id}/safety-checks",
            json={
                "project_id": project_id,
                "check_date": d,
                "check_type": "DAILY",
                "items_total": 5,
                "items_ok": 5,
                "items_ng": 0,
                "overall_result": "OK",
            },
            headers=admin_headers,
        )

    resp = await auth_client.get(
        f"/api/v1/projects/{project_id}/safety-checks",
        headers=admin_headers,
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["meta"]["total"] == 2
    assert len(body["data"]) == 2


@pytest.mark.asyncio
async def test_list_safety_checks_empty(auth_client, viewer_headers):
    """安全点検一覧 - 0件"""
    project_id = str(uuid.uuid4())
    resp = await auth_client.get(
        f"/api/v1/projects/{project_id}/safety-checks",
        headers=viewer_headers,
    )
    assert resp.status_code == 200
    assert resp.json()["meta"]["total"] == 0


@pytest.mark.asyncio
async def test_pm_can_create_safety_check(auth_client, pm_headers):
    """PROJECT_MANAGERは安全点検作成可"""
    project_id = str(uuid.uuid4())
    resp = await auth_client.post(
        f"/api/v1/projects/{project_id}/safety-checks",
        json={
            "project_id": project_id,
            "check_date": "2024-06-01",
            "check_type": "WEEKLY",
            "items_total": 20,
            "items_ok": 20,
            "items_ng": 0,
            "overall_result": "OK",
        },
        headers=pm_headers,
    )
    assert resp.status_code == 201


# ---------------------------------------------------------------------------
# 品質検査 CRUD
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_create_quality_inspection_unauthorized(client):
    """未認証で品質検査作成は401"""
    project_id = str(uuid.uuid4())
    resp = await client.post(
        f"/api/v1/projects/{project_id}/quality-inspections",
        json={
            "project_id": project_id,
            "inspection_date": "2024-01-15",
            "inspection_type": "CONCRETE",
            "target_item": "基礎コンクリート",
        },
    )
    assert resp.status_code in (401, 403)


@pytest.mark.asyncio
async def test_create_quality_inspection(auth_client, admin_headers):
    """品質検査作成 - 正常"""
    project_id = str(uuid.uuid4())
    resp = await auth_client.post(
        f"/api/v1/projects/{project_id}/quality-inspections",
        json={
            "project_id": project_id,
            "inspection_date": "2024-02-10",
            "inspection_type": "CONCRETE",
            "target_item": "基礎コンクリート強度",
            "standard_value": "21N/mm2以上",
            "measured_value": "25N/mm2",
            "result": "OK",
            "remarks": "基準値クリア",
        },
        headers=admin_headers,
    )
    assert resp.status_code == 201
    data = resp.json()["data"]
    assert data["inspection_type"] == "CONCRETE"
    assert data["result"] == "OK"
    assert data["target_item"] == "基礎コンクリート強度"


@pytest.mark.asyncio
async def test_list_quality_inspections(auth_client, admin_headers):
    """品質検査一覧取得"""
    project_id = str(uuid.uuid4())
    for d in ["2024-03-01", "2024-03-02"]:
        await auth_client.post(
            f"/api/v1/projects/{project_id}/quality-inspections",
            json={
                "project_id": project_id,
                "inspection_date": d,
                "inspection_type": "STEEL",
                "target_item": "鉄筋径",
                "result": "OK",
            },
            headers=admin_headers,
        )

    resp = await auth_client.get(
        f"/api/v1/projects/{project_id}/quality-inspections",
        headers=admin_headers,
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["meta"]["total"] == 2


@pytest.mark.asyncio
async def test_list_quality_inspections_empty(auth_client, viewer_headers):
    """品質検査一覧 - 0件"""
    project_id = str(uuid.uuid4())
    resp = await auth_client.get(
        f"/api/v1/projects/{project_id}/quality-inspections",
        headers=viewer_headers,
    )
    assert resp.status_code == 200
    assert resp.json()["meta"]["total"] == 0
