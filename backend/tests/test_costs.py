"""原価・工数管理APIテスト"""

import uuid

import pytest


# ---------------------------------------------------------------------------
# 認証なし
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_create_cost_record_unauthorized(client):
    """未認証で原価レコード作成は401"""
    project_id = str(uuid.uuid4())
    resp = await client.post(
        f"/api/v1/projects/{project_id}/cost-records",
        json={
            "project_id": project_id,
            "record_date": "2024-01-15",
            "category": "LABOR",
            "description": "テスト",
        },
    )
    assert resp.status_code in (401, 403)


@pytest.mark.asyncio
async def test_list_cost_records_unauthorized(client):
    """未認証で原価一覧は401"""
    project_id = str(uuid.uuid4())
    resp = await client.get(f"/api/v1/projects/{project_id}/cost-records")
    assert resp.status_code in (401, 403)


# ---------------------------------------------------------------------------
# 原価レコード CRUD
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_create_cost_record(auth_client, admin_headers):
    """原価レコード作成 - 正常"""
    project_id = str(uuid.uuid4())
    resp = await auth_client.post(
        f"/api/v1/projects/{project_id}/cost-records",
        json={
            "project_id": project_id,
            "record_date": "2024-01-15",
            "category": "LABOR",
            "description": "大工工賃",
            "budgeted_amount": "500000",
            "actual_amount": "480000",
            "vendor_name": "テスト建設",
            "invoice_number": "INV-2024-001",
        },
        headers=admin_headers,
    )
    assert resp.status_code == 201
    data = resp.json()["data"]
    assert data["category"] == "LABOR"
    assert data["description"] == "大工工賃"
    assert float(data["budgeted_amount"]) == 500000.0


@pytest.mark.asyncio
async def test_list_cost_records(auth_client, admin_headers):
    """原価レコード一覧取得"""
    project_id = str(uuid.uuid4())
    # 2件作成
    for i, cat in enumerate(["LABOR", "MATERIAL"]):
        await auth_client.post(
            f"/api/v1/projects/{project_id}/cost-records",
            json={
                "project_id": project_id,
                "record_date": f"2024-01-{15 + i}",
                "category": cat,
                "description": f"テスト{i}",
                "budgeted_amount": "100000",
                "actual_amount": "90000",
            },
            headers=admin_headers,
        )

    resp = await auth_client.get(
        f"/api/v1/projects/{project_id}/cost-records",
        headers=admin_headers,
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["meta"]["total"] == 2


@pytest.mark.asyncio
async def test_list_cost_records_empty(auth_client, admin_headers):
    """原価レコード一覧 - 0件"""
    project_id = str(uuid.uuid4())
    resp = await auth_client.get(
        f"/api/v1/projects/{project_id}/cost-records",
        headers=admin_headers,
    )
    assert resp.status_code == 200
    assert resp.json()["meta"]["total"] == 0


@pytest.mark.asyncio
async def test_get_cost_summary_empty(auth_client, admin_headers):
    """原価サマリー - データなし"""
    project_id = str(uuid.uuid4())
    resp = await auth_client.get(
        f"/api/v1/projects/{project_id}/cost-summary",
        headers=admin_headers,
    )
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert float(data["total_budgeted"]) == 0.0
    assert float(data["total_actual"]) == 0.0
    assert data["variance_rate"] == 0.0


@pytest.mark.asyncio
async def test_get_cost_summary_with_data(auth_client, admin_headers):
    """原価サマリー - データあり"""
    project_id = str(uuid.uuid4())
    # 原価データ追加
    await auth_client.post(
        f"/api/v1/projects/{project_id}/cost-records",
        json={
            "project_id": project_id,
            "record_date": "2024-02-01",
            "category": "LABOR",
            "description": "労務費",
            "budgeted_amount": "1000000",
            "actual_amount": "900000",
        },
        headers=admin_headers,
    )
    await auth_client.post(
        f"/api/v1/projects/{project_id}/cost-records",
        json={
            "project_id": project_id,
            "record_date": "2024-02-02",
            "category": "MATERIAL",
            "description": "材料費",
            "budgeted_amount": "500000",
            "actual_amount": "550000",
        },
        headers=admin_headers,
    )

    resp = await auth_client.get(
        f"/api/v1/projects/{project_id}/cost-summary",
        headers=admin_headers,
    )
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert float(data["total_budgeted"]) == 1500000.0
    assert float(data["total_actual"]) == 1450000.0
    assert "LABOR" in data["by_category"]
    assert "MATERIAL" in data["by_category"]


# ---------------------------------------------------------------------------
# 工数 CRUD
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_create_work_hour_unauthorized(client):
    """未認証で工数作成は401"""
    project_id = str(uuid.uuid4())
    resp = await client.post(
        f"/api/v1/projects/{project_id}/work-hours",
        json={
            "project_id": project_id,
            "work_date": "2024-01-15",
            "hours": "8.0",
        },
    )
    assert resp.status_code in (401, 403)


@pytest.mark.asyncio
async def test_create_work_hour(auth_client, admin_headers):
    """工数作成 - 正常"""
    project_id = str(uuid.uuid4())
    resp = await auth_client.post(
        f"/api/v1/projects/{project_id}/work-hours",
        json={
            "project_id": project_id,
            "work_date": "2024-03-15",
            "hours": "8.5",
            "work_type": "REGULAR",
            "description": "基礎工事作業",
        },
        headers=admin_headers,
    )
    assert resp.status_code == 201
    data = resp.json()["data"]
    assert float(data["hours"]) == 8.5
    assert data["work_type"] == "REGULAR"
