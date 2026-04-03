"""ITSMService のユニットテスト"""

import uuid

import pytest


@pytest.mark.asyncio
async def test_incident_crud(auth_client, admin_headers):
    """インシデントの作成・取得・一覧"""
    # Create
    resp = await auth_client.post(
        "/api/v1/itsm/incidents",
        json={
            "title": "テストインシデント",
            "description": "テスト用の障害報告",
            "priority": "HIGH",
            "severity": "HIGH",
        },
        headers=admin_headers,
    )
    assert resp.status_code == 201
    incident = resp.json()["data"]
    assert incident["title"] == "テストインシデント"
    assert incident["incident_number"].startswith("INC-")
    incident_id = incident["id"]

    # Get
    resp = await auth_client.get(
        f"/api/v1/itsm/incidents/{incident_id}", headers=admin_headers
    )
    assert resp.status_code == 200

    # List
    resp = await auth_client.get("/api/v1/itsm/incidents", headers=admin_headers)
    assert resp.status_code == 200
    assert resp.json()["meta"]["total"] >= 1


@pytest.mark.asyncio
async def test_incident_resolve(auth_client, admin_headers):
    """インシデントをRESOLVEDに更新するとresolved_atが設定される"""
    create_resp = await auth_client.post(
        "/api/v1/itsm/incidents",
        json={
            "title": "解決テスト",
            "description": "解決するインシデント",
            "priority": "MEDIUM",
        },
        headers=admin_headers,
    )
    incident_id = create_resp.json()["data"]["id"]

    # Resolve
    resp = await auth_client.patch(
        f"/api/v1/itsm/incidents/{incident_id}",
        json={"status": "RESOLVED", "resolution": "修正済み"},
        headers=admin_headers,
    )
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert data["status"] == "RESOLVED"
    assert data["resolved_at"] is not None


@pytest.mark.asyncio
async def test_incident_not_found(auth_client, admin_headers):
    """存在しないインシデントは404"""
    resp = await auth_client.get(
        f"/api/v1/itsm/incidents/{uuid.uuid4()}", headers=admin_headers
    )
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_change_request_crud(auth_client, admin_headers):
    """変更要求の作成・一覧"""
    resp = await auth_client.post(
        "/api/v1/itsm/changes",
        json={
            "title": "DB変更",
            "description": "テーブル追加",
            "change_type": "NORMAL",
            "risk_level": "LOW",
        },
        headers=admin_headers,
    )
    assert resp.status_code == 201
    change = resp.json()["data"]
    assert change["change_number"].startswith("CHG-")

    # List
    resp = await auth_client.get("/api/v1/itsm/changes", headers=admin_headers)
    assert resp.status_code == 200
    assert resp.json()["meta"]["total"] >= 1


@pytest.mark.asyncio
async def test_change_approve(auth_client, admin_headers):
    """変更要求の承認"""
    create_resp = await auth_client.post(
        "/api/v1/itsm/changes",
        json={
            "title": "承認テスト",
            "description": "承認フロー確認",
            "change_type": "STANDARD",
            "risk_level": "MEDIUM",
        },
        headers=admin_headers,
    )
    change_id = create_resp.json()["data"]["id"]

    resp = await auth_client.patch(
        f"/api/v1/itsm/changes/{change_id}/approve", headers=admin_headers
    )
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert data["status"] == "APPROVED"
    assert data["approved_by"] is not None
