"""通知設定 API 統合テスト"""

from __future__ import annotations

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_get_preferences_creates_default(
    auth_client: AsyncClient, admin_headers: dict
):
    """初回 GET でデフォルト値が返る"""
    resp = await auth_client.get(
        "/api/v1/users/me/notification-preferences",
        headers=admin_headers,
    )
    assert resp.status_code == 200, resp.text
    data = resp.json()["data"]
    assert data["email_enabled"] is True
    assert data["slack_enabled"] is False
    assert data["slack_webhook_url"] is None
    assert "daily_report_submitted" in data["events"]


@pytest.mark.asyncio
async def test_get_preferences_requires_auth(auth_client: AsyncClient):
    """認証必須: トークン無しは 401"""
    resp = await auth_client.get("/api/v1/users/me/notification-preferences")
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_patch_preferences_partial_update(
    auth_client: AsyncClient, admin_headers: dict
):
    """部分更新: email_enabled のみ変更"""
    # 初期状態を作成
    await auth_client.get(
        "/api/v1/users/me/notification-preferences", headers=admin_headers
    )

    resp = await auth_client.patch(
        "/api/v1/users/me/notification-preferences",
        json={"email_enabled": False},
        headers=admin_headers,
    )
    assert resp.status_code == 200, resp.text
    data = resp.json()["data"]
    assert data["email_enabled"] is False
    assert data["slack_enabled"] is False


@pytest.mark.asyncio
async def test_patch_preferences_with_slack_webhook(
    auth_client: AsyncClient, admin_headers: dict
):
    """Slack Webhook URL の設定"""
    webhook = "https://example.com/webhook/slack-integration"
    resp = await auth_client.patch(
        "/api/v1/users/me/notification-preferences",
        json={
            "slack_enabled": True,
            "slack_webhook_url": webhook,
        },
        headers=admin_headers,
    )
    assert resp.status_code == 200, resp.text
    data = resp.json()["data"]
    assert data["slack_enabled"] is True
    assert data["slack_webhook_url"] == webhook


@pytest.mark.asyncio
async def test_patch_preferences_events_full_replace(
    auth_client: AsyncClient, admin_headers: dict
):
    """events は完全置換される"""
    new_events = {
        "daily_report_submitted": {"email": False, "slack": True},
    }
    resp = await auth_client.patch(
        "/api/v1/users/me/notification-preferences",
        json={"events": new_events},
        headers=admin_headers,
    )
    assert resp.status_code == 200, resp.text
    data = resp.json()["data"]
    assert data["events"] == new_events


@pytest.mark.asyncio
async def test_patch_preferences_invalid_webhook_url(
    auth_client: AsyncClient, admin_headers: dict
):
    """不正な Webhook URL はバリデーションエラー"""
    resp = await auth_client.patch(
        "/api/v1/users/me/notification-preferences",
        json={"slack_webhook_url": "not-a-valid-url"},
        headers=admin_headers,
    )
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_preferences_isolated_per_user(
    auth_client: AsyncClient, admin_headers: dict, pm_headers: dict
):
    """各ユーザーの設定は独立"""
    # admin が email OFF
    await auth_client.patch(
        "/api/v1/users/me/notification-preferences",
        json={"email_enabled": False},
        headers=admin_headers,
    )
    # pm は影響を受けない
    resp = await auth_client.get(
        "/api/v1/users/me/notification-preferences",
        headers=pm_headers,
    )
    assert resp.status_code == 200
    assert resp.json()["data"]["email_enabled"] is True
