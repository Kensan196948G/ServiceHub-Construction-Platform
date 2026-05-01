"""ITSM APIテスト"""

import uuid

import pytest
from httpx import ASGITransport, AsyncClient

from app.core.rbac import UserRole
from app.main import app


class FakeITUser:
    id = "00000000-0000-0000-0000-000000000003"
    username = "itoperator"
    role = UserRole.IT_OPERATOR
    is_active = True


class FakeAdminUser:
    id = "00000000-0000-0000-0000-000000000001"
    username = "admin"
    role = UserRole.ADMIN
    is_active = True


@pytest.mark.asyncio
async def test_create_incident_unauthorized():
    """未認証でインシデント作成は401"""
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        resp = await client.post(
            "/api/v1/itsm/incidents",
            json={
                "title": "テスト障害",
                "description": "テスト詳細",
            },
        )
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_list_incidents_requires_auth():
    """未認証でインシデント一覧は401"""
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        resp = await client.get("/api/v1/itsm/incidents")
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_list_changes_requires_auth():
    """未認証で変更要求一覧は401"""
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        resp = await client.get("/api/v1/itsm/changes")
    assert resp.status_code == 401


# ---------------------------------------------------------------------------
# インシデント CRUD
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_create_incident(auth_client, it_headers):
    """インシデント作成 - 正常"""
    resp = await auth_client.post(
        "/api/v1/itsm/incidents",
        json={
            "title": "ネットワーク障害",
            "description": "本社-現場間のVPN接続が切断",
            "category": "NETWORK",
            "priority": "HIGH",
            "severity": "HIGH",
        },
        headers=it_headers,
    )
    assert resp.status_code == 201
    data = resp.json()["data"]
    assert data["title"] == "ネットワーク障害"
    assert data["category"] == "NETWORK"
    assert data["priority"] == "HIGH"
    assert data["incident_number"].startswith("INC-")
    assert data["status"] == "OPEN"


@pytest.mark.asyncio
async def test_list_incidents(auth_client, it_headers):
    """インシデント一覧取得"""
    # 2件作成
    for title in ["障害1", "障害2"]:
        await auth_client.post(
            "/api/v1/itsm/incidents",
            json={
                "title": title,
                "description": "詳細",
                "category": "SYSTEM",
                "priority": "MEDIUM",
                "severity": "MEDIUM",
            },
            headers=it_headers,
        )

    resp = await auth_client.get("/api/v1/itsm/incidents", headers=it_headers)
    assert resp.status_code == 200
    body = resp.json()
    assert body["meta"]["total"] >= 2


@pytest.mark.asyncio
async def test_list_incidents_with_filter(auth_client, it_headers):
    """インシデント一覧 - ステータスフィルタ"""
    resp = await auth_client.get(
        "/api/v1/itsm/incidents?status=OPEN",
        headers=it_headers,
    )
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_get_incident_not_found(auth_client, it_headers):
    """存在しないインシデントは404"""
    fake_id = str(uuid.uuid4())
    resp = await auth_client.get(
        f"/api/v1/itsm/incidents/{fake_id}",
        headers=it_headers,
    )
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_get_incident_success(auth_client, it_headers):
    """インシデント詳細取得 - 正常"""
    create_resp = await auth_client.post(
        "/api/v1/itsm/incidents",
        json={
            "title": "アプリケーションエラー",
            "description": "APIサーバが500エラーを返す",
            "category": "APPLICATION",
            "priority": "CRITICAL",
            "severity": "CRITICAL",
        },
        headers=it_headers,
    )
    assert create_resp.status_code == 201
    incident_id = create_resp.json()["data"]["id"]

    get_resp = await auth_client.get(
        f"/api/v1/itsm/incidents/{incident_id}",
        headers=it_headers,
    )
    assert get_resp.status_code == 200
    assert get_resp.json()["data"]["id"] == incident_id


@pytest.mark.asyncio
async def test_update_incident_not_found(auth_client, it_headers):
    """存在しないインシデントの更新は404"""
    fake_id = str(uuid.uuid4())
    resp = await auth_client.patch(
        f"/api/v1/itsm/incidents/{fake_id}",
        json={"status": "IN_PROGRESS"},
        headers=it_headers,
    )
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_update_incident_status(auth_client, it_headers):
    """インシデントステータス更新"""
    create_resp = await auth_client.post(
        "/api/v1/itsm/incidents",
        json={
            "title": "セキュリティアラート",
            "description": "不審なアクセス検知",
            "category": "SECURITY",
            "priority": "HIGH",
            "severity": "HIGH",
        },
        headers=it_headers,
    )
    incident_id = create_resp.json()["data"]["id"]

    update_resp = await auth_client.patch(
        f"/api/v1/itsm/incidents/{incident_id}",
        json={"status": "IN_PROGRESS"},
        headers=it_headers,
    )
    assert update_resp.status_code == 200
    assert update_resp.json()["data"]["status"] == "IN_PROGRESS"


@pytest.mark.asyncio
async def test_resolve_incident(auth_client, it_headers):
    """インシデント解決（resolved_at設定）"""
    create_resp = await auth_client.post(
        "/api/v1/itsm/incidents",
        json={
            "title": "軽微な障害",
            "description": "一時的な接続不安定",
            "category": "NETWORK",
            "priority": "LOW",
            "severity": "LOW",
        },
        headers=it_headers,
    )
    incident_id = create_resp.json()["data"]["id"]

    resolve_resp = await auth_client.patch(
        f"/api/v1/itsm/incidents/{incident_id}",
        json={"status": "RESOLVED", "resolution": "ルータ再起動で解消"},
        headers=it_headers,
    )
    assert resolve_resp.status_code == 200
    data = resolve_resp.json()["data"]
    assert data["status"] == "RESOLVED"
    assert data["resolution"] == "ルータ再起動で解消"
    assert data["resolved_at"] is not None


# ---------------------------------------------------------------------------
# 変更要求 CRUD
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_create_change_request(auth_client, it_headers):
    """変更要求作成 - 正常"""
    resp = await auth_client.post(
        "/api/v1/itsm/changes",
        json={
            "title": "ファイアウォールルール変更",
            "description": "新規IPアドレスへのアクセス許可追加",
            "change_type": "NORMAL",
            "risk_level": "MEDIUM",
            "impact": "一部ユーザーへの影響あり",
            "rollback_plan": "ルール削除で元に戻す",
        },
        headers=it_headers,
    )
    assert resp.status_code == 201
    data = resp.json()["data"]
    assert data["title"] == "ファイアウォールルール変更"
    assert data["change_number"].startswith("CHG-")
    assert data["status"] == "DRAFT"


@pytest.mark.asyncio
async def test_list_changes(auth_client, it_headers):
    """変更要求一覧取得"""
    await auth_client.post(
        "/api/v1/itsm/changes",
        json={
            "title": "OS定期パッチ適用",
            "description": "月次パッチ適用",
            "change_type": "STANDARD",
            "risk_level": "LOW",
        },
        headers=it_headers,
    )

    resp = await auth_client.get("/api/v1/itsm/changes", headers=it_headers)
    assert resp.status_code == 200
    body = resp.json()
    assert body["meta"]["total"] >= 1


@pytest.mark.asyncio
async def test_list_changes_with_filter(auth_client, it_headers):
    """変更要求一覧 - フィルタ"""
    resp = await auth_client.get(
        "/api/v1/itsm/changes?status=DRAFT",
        headers=it_headers,
    )
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_approve_change_not_found(auth_client, admin_headers):
    """存在しない変更要求の承認は404"""
    fake_id = str(uuid.uuid4())
    resp = await auth_client.patch(
        f"/api/v1/itsm/changes/{fake_id}/approve",
        headers=admin_headers,
    )
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_approve_change_success(auth_client, it_headers, admin_headers):
    """変更要求承認 - 正常"""
    create_resp = await auth_client.post(
        "/api/v1/itsm/changes",
        json={
            "title": "データベースバックアップ設定変更",
            "description": "バックアップ頻度を毎日から毎時に変更",
            "change_type": "NORMAL",
            "risk_level": "HIGH",
            "rollback_plan": "元の設定ファイルに戻す",
        },
        headers=it_headers,
    )
    change_id = create_resp.json()["data"]["id"]

    approve_resp = await auth_client.patch(
        f"/api/v1/itsm/changes/{change_id}/approve",
        headers=admin_headers,
    )
    assert approve_resp.status_code == 200
    data = approve_resp.json()["data"]
    assert data["status"] == "APPROVED"
    assert data["approved_by"] is not None
