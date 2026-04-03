"""DashboardService のユニットテスト"""

import uuid

import pytest


@pytest.mark.asyncio
async def test_kpi_empty(auth_client, admin_headers):
    """空のDBでKPIは全ゼロを返す"""
    resp = await auth_client.get("/api/v1/dashboard/kpi", headers=admin_headers)
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert data["projects"]["total"] == 0
    assert data["incidents"]["total"] == 0
    assert data["cost_overview"]["total_budgeted"] == 0
    assert data["daily_reports_count"] == 0
    assert data["photos_count"] == 0
    # users_count >= 4 (test fixtures create 4 users)
    assert data["users_count"] >= 4


@pytest.mark.asyncio
async def test_kpi_with_projects(auth_client, admin_headers):
    """プロジェクト作成+ステータス変更後にKPIが反映される"""
    project_ids = []
    for i in range(4):
        resp = await auth_client.post(
            "/api/v1/projects",
            json={
                "project_code": f"KPI-{uuid.uuid4().hex[:6]}",
                "name": f"KPI Test {i}",
                "client_name": "Client",
            },
            headers=admin_headers,
        )
        project_ids.append(resp.json()["data"]["id"])

    # Update statuses (ProjectCreate has no status field, defaults to PLANNING)
    for pid, status in zip(
        project_ids, ["PLANNING", "IN_PROGRESS", "IN_PROGRESS", "COMPLETED"]
    ):
        await auth_client.put(
            f"/api/v1/projects/{pid}",
            json={"status": status},
            headers=admin_headers,
        )

    resp = await auth_client.get("/api/v1/dashboard/kpi", headers=admin_headers)
    assert resp.status_code == 200
    projects = resp.json()["data"]["projects"]
    assert projects["total"] >= 4
    assert projects["planning"] >= 1
    assert projects["in_progress"] >= 2
    assert projects["completed"] >= 1


@pytest.mark.asyncio
async def test_kpi_with_incidents(auth_client, admin_headers):
    """インシデント作成後にKPIが反映される"""
    await auth_client.post(
        "/api/v1/itsm/incidents",
        json={
            "title": "KPI Test Incident",
            "description": "テスト用",
            "priority": "HIGH",
            "severity": "HIGH",
        },
        headers=admin_headers,
    )

    resp = await auth_client.get("/api/v1/dashboard/kpi", headers=admin_headers)
    assert resp.status_code == 200
    incidents = resp.json()["data"]["incidents"]
    assert incidents["total"] >= 1


@pytest.mark.asyncio
async def test_kpi_with_cost_records(auth_client, admin_headers):
    """原価レコード作成後にKPIが反映される"""
    project_resp = await auth_client.post(
        "/api/v1/projects",
        json={
            "project_code": f"KPIC-{uuid.uuid4().hex[:6]}",
            "name": "Cost KPI Test",
            "client_name": "Client",
            "status": "ACTIVE",
        },
        headers=admin_headers,
    )
    project_id = project_resp.json()["data"]["id"]

    await auth_client.post(
        f"/api/v1/projects/{project_id}/cost-records",
        json={
            "project_id": project_id,
            "category": "材料費",
            "description": "KPIテスト",
            "budgeted_amount": "500000",
            "actual_amount": "450000",
            "record_date": "2026-04-04",
        },
        headers=admin_headers,
    )

    resp = await auth_client.get("/api/v1/dashboard/kpi", headers=admin_headers)
    assert resp.status_code == 200
    cost = resp.json()["data"]["cost_overview"]
    assert cost["total_budgeted"] >= 500000
    assert cost["total_actual"] >= 450000
    assert cost["variance"] >= 0
