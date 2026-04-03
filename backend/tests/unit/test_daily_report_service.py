"""DailyReportService のユニットテスト"""

import uuid

import pytest


@pytest.mark.asyncio
async def test_daily_report_crud(auth_client, admin_headers):
    """日報のCRUD全操作"""
    project_resp = await auth_client.post(
        "/api/v1/projects",
        json={
            "project_code": f"DR-{uuid.uuid4().hex[:6]}",
            "name": "Report Test",
            "client_name": "Client",
            "status": "ACTIVE",
        },
        headers=admin_headers,
    )
    project_id = project_resp.json()["data"]["id"]

    # Create
    resp = await auth_client.post(
        f"/api/v1/projects/{project_id}/daily-reports",
        json={
            "project_id": project_id,
            "report_date": "2026-04-04",
            "weather": "晴れ",
            "temperature_high": 22.5,
            "temperature_low": 12.0,
            "work_description": "基礎工事実施",
            "workers_count": 15,
        },
        headers=admin_headers,
    )
    assert resp.status_code == 201
    report = resp.json()["data"]
    report_id = report["id"]

    # Get
    resp = await auth_client.get(
        f"/api/v1/daily-reports/{report_id}", headers=admin_headers
    )
    assert resp.status_code == 200
    assert resp.json()["data"]["weather"] == "晴れ"

    # List
    resp = await auth_client.get(
        f"/api/v1/projects/{project_id}/daily-reports", headers=admin_headers
    )
    assert resp.status_code == 200
    assert resp.json()["meta"]["total"] >= 1

    # Delete
    resp = await auth_client.delete(
        f"/api/v1/daily-reports/{report_id}", headers=admin_headers
    )
    assert resp.status_code == 204


@pytest.mark.asyncio
async def test_daily_report_not_found(auth_client, admin_headers):
    """存在しない日報は404"""
    resp = await auth_client.get(
        f"/api/v1/daily-reports/{uuid.uuid4()}", headers=admin_headers
    )
    assert resp.status_code == 404
