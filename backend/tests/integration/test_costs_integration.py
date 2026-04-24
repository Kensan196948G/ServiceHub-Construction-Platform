"""原価・工数管理 統合テスト — CRUD ライフサイクルを DB経由で検証"""

from __future__ import annotations

import uuid

import pytest
from httpx import AsyncClient


def _project_payload(suffix: str = "001") -> dict:
    return {
        "name": f"原価テスト工事{suffix}",
        "project_code": f"COST-PRJ-{suffix}",
        "description": "統合テスト用",
        "status": "PLANNING",
        "budget": 50000000.0,
        "start_date": "2026-04-01",
        "end_date": "2026-09-30",
        "location": "東京都",
        "client_name": "原価テスト施主",
    }


@pytest.mark.asyncio
async def test_cost_record_create_and_list(
    auth_client: AsyncClient, admin_headers: dict
):
    """原価レコード作成 → 一覧で件数確認するライフサイクルテスト"""
    # 1. 案件作成
    prj_resp = await auth_client.post(
        "/api/v1/projects/", json=_project_payload("C01"), headers=admin_headers
    )
    assert prj_resp.status_code == 201
    project_id = prj_resp.json()["data"]["id"]

    # 2. 原価レコード作成
    payload = {
        "project_id": project_id,
        "record_date": "2026-05-01",
        "category": "LABOR",
        "description": "大工工賃",
        "budgeted_amount": "1000000",
        "actual_amount": "950000",
        "vendor_name": "テスト大工",
        "invoice_number": "INV-2026-001",
    }
    cr_resp = await auth_client.post(
        f"/api/v1/projects/{project_id}/cost-records",
        json=payload,
        headers=admin_headers,
    )
    assert cr_resp.status_code == 201
    record = cr_resp.json()["data"]
    assert record["category"] == "LABOR"
    assert float(record["budgeted_amount"]) == 1000000.0
    record_id = record["id"]

    # 3. 一覧確認
    list_resp = await auth_client.get(
        f"/api/v1/projects/{project_id}/cost-records",
        headers=admin_headers,
    )
    assert list_resp.status_code == 200
    items = list_resp.json()["data"]
    assert len(items) >= 1
    assert any(r["id"] == record_id for r in items)


@pytest.mark.asyncio
async def test_cost_record_multiple_categories(
    auth_client: AsyncClient, admin_headers: dict
):
    """複数カテゴリ原価レコード作成とサマリー検証"""
    prj_resp = await auth_client.post(
        "/api/v1/projects/", json=_project_payload("C02"), headers=admin_headers
    )
    project_id = prj_resp.json()["data"]["id"]

    categories = [
        ("LABOR", "500000", "450000"),
        ("MATERIAL", "300000", "310000"),
        ("EQUIPMENT", "200000", "180000"),
    ]
    for cat, budgeted, actual in categories:
        resp = await auth_client.post(
            f"/api/v1/projects/{project_id}/cost-records",
            json={
                "project_id": project_id,
                "record_date": "2026-05-01",
                "category": cat,
                "description": f"{cat}費",
                "budgeted_amount": budgeted,
                "actual_amount": actual,
            },
            headers=admin_headers,
        )
        assert resp.status_code == 201

    # サマリー確認
    summary_resp = await auth_client.get(
        f"/api/v1/projects/{project_id}/cost-summary",
        headers=admin_headers,
    )
    assert summary_resp.status_code == 200
    summary = summary_resp.json()["data"]
    assert float(summary["total_budgeted"]) == 1000000.0
    assert float(summary["total_actual"]) == 940000.0


@pytest.mark.asyncio
async def test_cost_record_viewer_cannot_read(
    auth_client: AsyncClient, admin_headers: dict, viewer_headers: dict
):
    """VIEWER ロールは原価レコード閲覧不可（財務情報は制限ロールのみ）"""
    prj_resp = await auth_client.post(
        "/api/v1/projects/", json=_project_payload("C03"), headers=admin_headers
    )
    project_id = prj_resp.json()["data"]["id"]

    # admin で作成
    await auth_client.post(
        f"/api/v1/projects/{project_id}/cost-records",
        json={
            "project_id": project_id,
            "record_date": "2026-05-01",
            "category": "LABOR",
            "description": "閲覧テスト",
            "budgeted_amount": "100000",
            "actual_amount": "100000",
        },
        headers=admin_headers,
    )

    # viewer は 403
    resp = await auth_client.get(
        f"/api/v1/projects/{project_id}/cost-records",
        headers=viewer_headers,
    )
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_cost_record_viewer_cannot_create(
    auth_client: AsyncClient, viewer_headers: dict
):
    """VIEWER ロールは原価レコード作成不可"""
    project_id = str(uuid.uuid4())
    resp = await auth_client.post(
        f"/api/v1/projects/{project_id}/cost-records",
        json={
            "project_id": project_id,
            "record_date": "2026-05-01",
            "category": "LABOR",
            "description": "VIEWER作成テスト",
            "budgeted_amount": "100000",
            "actual_amount": "100000",
        },
        headers=viewer_headers,
    )
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_cost_record_unknown_project_returns_404(
    auth_client: AsyncClient, admin_headers: dict
):
    """存在しない project_id への原価レコード作成は 404"""
    fake_id = str(uuid.uuid4())
    resp = await auth_client.post(
        f"/api/v1/projects/{fake_id}/cost-records",
        json={
            "project_id": fake_id,
            "record_date": "2026-05-01",
            "category": "LABOR",
            "description": "存在しない案件テスト",
            "budgeted_amount": "100000",
            "actual_amount": "100000",
        },
        headers=admin_headers,
    )
    assert resp.status_code == 404
