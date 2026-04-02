"""ITSM 統合テスト（ISO20000準拠 SoD検証）"""
from __future__ import annotations
import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_incident_lifecycle(client: AsyncClient, it_headers: dict, admin_headers: dict):
    """インシデント起票→更新→解決 ライフサイクル"""
    # 1. 起票 (IT_OPERATOR)
    resp = await client.post("/api/v1/itsm/incidents", json={
        "title": "本番DBへの接続エラー",
        "description": "PostgreSQLへの接続が断続的に失敗",
        "category": "SYSTEM",
        "priority": "HIGH",
        "severity": "HIGH",
    }, headers=it_headers)
    assert resp.status_code == 201, resp.text
    incident = resp.json()["data"]
    assert incident["incident_number"].startswith("INC-")
    assert incident["status"] == "OPEN"
    incident_id = incident["id"]

    # 2. 一覧取得
    resp = await client.get("/api/v1/itsm/incidents", headers=it_headers)
    assert resp.status_code == 200
    assert resp.json()["total"] >= 1

    # 3. 解決
    resp = await client.patch(f"/api/v1/itsm/incidents/{incident_id}", json={
        "status": "RESOLVED",
        "resolution": "PostgreSQL接続プールを増量して解決",
    }, headers=it_headers)
    assert resp.status_code == 200
    assert resp.json()["data"]["status"] == "RESOLVED"
    assert resp.json()["data"]["resolved_at"] is not None


@pytest.mark.asyncio
async def test_change_request_sod(client: AsyncClient, it_headers: dict, admin_headers: dict, pm_headers: dict):
    """変更管理SoD: IT_OPERATORが起票、ADMINのみ承認可"""
    # 1. 起票 (IT_OPERATOR)
    resp = await client.post("/api/v1/itsm/changes", json={
        "title": "Nginx設定変更",
        "description": "HTTPSリダイレクト設定追加",
        "change_type": "NORMAL",
        "risk_level": "LOW",
        "rollback_plan": "元のnginx.confに戻す",
    }, headers=it_headers)
    assert resp.status_code == 201, resp.text
    change = resp.json()["data"]
    assert change["change_number"].startswith("CHG-")
    change_id = change["id"]

    # 2. PMは承認不可（SoD検証）
    resp = await client.patch(f"/api/v1/itsm/changes/{change_id}/approve", headers=pm_headers)
    assert resp.status_code == 403

    # 3. ADMINは承認可
    resp = await client.patch(f"/api/v1/itsm/changes/{change_id}/approve", headers=admin_headers)
    assert resp.status_code == 200
    assert resp.json()["data"]["status"] == "APPROVED"
    assert resp.json()["data"]["approved_by"] is not None


@pytest.mark.asyncio
async def test_incident_not_found(client: AsyncClient, it_headers: dict):
    """存在しないインシデントは404"""
    import uuid
    resp = await client.get(f"/api/v1/itsm/incidents/{uuid.uuid4()}", headers=it_headers)
    assert resp.status_code == 404
