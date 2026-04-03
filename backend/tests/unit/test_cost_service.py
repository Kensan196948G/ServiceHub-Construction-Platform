"""CostService のユニットテスト"""

import uuid

import pytest


@pytest.mark.asyncio
async def test_cost_summary_empty_project(auth_client, admin_headers):
    """存在しないプロジェクトの予実サマリーはゼロを返す"""
    project_id = uuid.uuid4()
    response = await auth_client.get(
        f"/api/v1/projects/{project_id}/cost-summary",
        headers=admin_headers,
    )
    assert response.status_code == 200
    data = response.json()["data"]
    assert float(data["total_budgeted"]) == 0
    assert float(data["total_actual"]) == 0
    assert float(data["variance"]) == 0
    assert data["variance_rate"] == 0.0


@pytest.mark.asyncio
async def test_cost_record_crud(auth_client, admin_headers):
    """原価記録のCRUD（作成→一覧→削除）"""
    # First create a project
    project_resp = await auth_client.post(
        "/api/v1/projects",
        json={
            "project_code": f"COST-TEST-{uuid.uuid4().hex[:6]}",
            "name": "Cost Test Project",
            "client_name": "Test Client",
            "status": "PLANNING",
        },
        headers=admin_headers,
    )
    assert project_resp.status_code == 201
    project_id = project_resp.json()["data"]["id"]

    # Create cost record
    create_resp = await auth_client.post(
        f"/api/v1/projects/{project_id}/cost-records",
        json={
            "project_id": project_id,
            "category": "材料費",
            "description": "鉄骨資材",
            "budgeted_amount": "1000000",
            "actual_amount": "950000",
            "record_date": "2026-04-01",
        },
        headers=admin_headers,
    )
    assert create_resp.status_code == 201
    record = create_resp.json()["data"]
    assert record["category"] == "材料費"
    record_id = record["id"]

    # List
    list_resp = await auth_client.get(
        f"/api/v1/projects/{project_id}/cost-records",
        headers=admin_headers,
    )
    assert list_resp.status_code == 200
    assert list_resp.json()["meta"]["total"] >= 1

    # Delete
    del_resp = await auth_client.delete(
        f"/api/v1/projects/{project_id}/cost-records/{record_id}",
        headers=admin_headers,
    )
    assert del_resp.status_code == 204


@pytest.mark.asyncio
async def test_cost_summary_with_records(auth_client, admin_headers):
    """予実サマリーが正しく計算される"""
    # Create project
    project_resp = await auth_client.post(
        "/api/v1/projects",
        json={
            "project_code": f"SUM-TEST-{uuid.uuid4().hex[:6]}",
            "name": "Summary Test",
            "client_name": "Client",
            "status": "ACTIVE",
        },
        headers=admin_headers,
    )
    project_id = project_resp.json()["data"]["id"]

    # Create two cost records
    for budget, actual, cat in [
        ("500000", "480000", "材料費"),
        ("300000", "320000", "外注費"),
    ]:
        await auth_client.post(
            f"/api/v1/projects/{project_id}/cost-records",
            json={
                "project_id": project_id,
                "category": cat,
                "description": f"test {cat}",
                "budgeted_amount": budget,
                "actual_amount": actual,
                "record_date": "2026-04-01",
            },
            headers=admin_headers,
        )

    # Get summary
    resp = await auth_client.get(
        f"/api/v1/projects/{project_id}/cost-summary",
        headers=admin_headers,
    )
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert float(data["total_budgeted"]) == 800000
    assert float(data["total_actual"]) == 800000
    assert "by_category" in data
    assert len(data["by_category"]) == 2


@pytest.mark.asyncio
async def test_cost_record_delete_not_found(auth_client, admin_headers):
    """存在しない原価記録の削除は404"""
    project_id = uuid.uuid4()
    fake_id = uuid.uuid4()
    resp = await auth_client.delete(
        f"/api/v1/projects/{project_id}/cost-records/{fake_id}",
        headers=admin_headers,
    )
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_work_hour_create(auth_client, admin_headers):
    """工数記録の作成"""
    # Create project
    project_resp = await auth_client.post(
        "/api/v1/projects",
        json={
            "project_code": f"WH-TEST-{uuid.uuid4().hex[:6]}",
            "name": "WorkHour Test",
            "client_name": "Client",
            "status": "ACTIVE",
        },
        headers=admin_headers,
    )
    project_id = project_resp.json()["data"]["id"]

    resp = await auth_client.post(
        f"/api/v1/projects/{project_id}/work-hours",
        json={
            "project_id": project_id,
            "work_date": "2026-04-01",
            "hours": "8.0",
            "work_type": "REGULAR",
            "description": "基礎工事",
        },
        headers=admin_headers,
    )
    assert resp.status_code == 201
    data = resp.json()["data"]
    assert data["work_type"] == "REGULAR"
    assert float(data["hours"]) == 8.0
