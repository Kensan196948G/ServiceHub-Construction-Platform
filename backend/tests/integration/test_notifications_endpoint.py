"""POST /api/v1/notifications/test 統合テスト (Phase 2b)

BackgroundTasks で非同期実行されるため、レスポンス自体は 202 Accepted のみを
確認する。実際の配信はスケジュールされるが、テスト内では配信完了を待機しない。
"""

from __future__ import annotations

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_post_notification_test_no_preferences_defaults_to_email(
    auth_client: AsyncClient, admin_headers: dict
):
    """preferences 未設定の場合、デフォルトで email チャンネルのみスケジュール。"""
    resp = await auth_client.post(
        "/api/v1/notifications/test",
        headers=admin_headers,
    )
    assert resp.status_code == 202, resp.text
    data = resp.json()["data"]
    assert "email" in data["scheduled_channels"]
    assert isinstance(data["message"], str)
    assert len(data["message"]) > 0


@pytest.mark.asyncio
async def test_post_notification_test_requires_auth(auth_client: AsyncClient):
    """認証必須: トークン無しは 401。"""
    resp = await auth_client.post("/api/v1/notifications/test")
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_post_notification_test_email_only_when_email_enabled(
    auth_client: AsyncClient, admin_headers: dict
):
    """email_enabled=True, slack_enabled=False → email のみスケジュール。"""
    # preferences を作成
    await auth_client.patch(
        "/api/v1/users/me/notification-preferences",
        json={"email_enabled": True, "slack_enabled": False},
        headers=admin_headers,
    )

    resp = await auth_client.post(
        "/api/v1/notifications/test",
        headers=admin_headers,
    )
    assert resp.status_code == 202, resp.text
    data = resp.json()["data"]
    assert data["scheduled_channels"] == ["email"]


@pytest.mark.asyncio
async def test_post_notification_test_slack_added_when_enabled(
    auth_client: AsyncClient, admin_headers: dict
):
    """email + slack webhook 設定済み → 両チャンネルがスケジュールされる。"""
    await auth_client.patch(
        "/api/v1/users/me/notification-preferences",
        json={
            "email_enabled": True,
            "slack_enabled": True,
            "slack_webhook_url": "https://hooks.slack.example.com/services/XXX",
        },
        headers=admin_headers,
    )

    resp = await auth_client.post(
        "/api/v1/notifications/test",
        headers=admin_headers,
    )
    assert resp.status_code == 202, resp.text
    data = resp.json()["data"]
    assert "email" in data["scheduled_channels"]
    assert "slack" in data["scheduled_channels"]
    assert len(data["scheduled_channels"]) == 2


@pytest.mark.asyncio
async def test_post_notification_test_slack_without_webhook_is_not_scheduled(
    auth_client: AsyncClient, admin_headers: dict
):
    """slack_enabled=True だが webhook_url 未設定 → slack はスケジュールされない。"""
    await auth_client.patch(
        "/api/v1/users/me/notification-preferences",
        json={"email_enabled": True, "slack_enabled": True, "slack_webhook_url": None},
        headers=admin_headers,
    )

    resp = await auth_client.post(
        "/api/v1/notifications/test",
        headers=admin_headers,
    )
    assert resp.status_code == 202, resp.text
    data = resp.json()["data"]
    # webhook が無いので slack はリストに含まれない
    assert "slack" not in data["scheduled_channels"]
    assert "email" in data["scheduled_channels"]


@pytest.mark.asyncio
async def test_post_notification_test_400_when_all_channels_disabled(
    auth_client: AsyncClient, admin_headers: dict
):
    """email_enabled=False かつ slack 無効 → 400 Bad Request。"""
    await auth_client.patch(
        "/api/v1/users/me/notification-preferences",
        json={"email_enabled": False, "slack_enabled": False},
        headers=admin_headers,
    )

    resp = await auth_client.post(
        "/api/v1/notifications/test",
        headers=admin_headers,
    )
    assert resp.status_code == 400, resp.text


@pytest.mark.asyncio
async def test_post_notification_test_message_mentions_channel_count(
    auth_client: AsyncClient, admin_headers: dict
):
    """レスポンスメッセージがスケジュールされたチャンネル数を含む。"""
    resp = await auth_client.post(
        "/api/v1/notifications/test",
        headers=admin_headers,
    )
    assert resp.status_code == 202, resp.text
    data = resp.json()["data"]
    channel_count = len(data["scheduled_channels"])
    # メッセージ内に件数が含まれている ("1 件" or "2 件")
    assert str(channel_count) in data["message"]
