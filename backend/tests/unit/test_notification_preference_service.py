"""NotificationPreferenceService のユニットテスト"""

import pytest

from app.schemas.notification_preference import NotificationPreferenceUpdate
from app.services.notification_preference_service import (
    DEFAULT_EVENTS,
    NotificationPreferenceService,
)
from tests.conftest import ADMIN_USER_ID, VIEWER_USER_ID


@pytest.mark.asyncio
async def test_get_or_create_upsert_on_read(db_session_with_users):
    """初回 GET 時にデフォルト値でレコードが自動作成される"""
    svc = NotificationPreferenceService(db_session_with_users)
    pref = await svc.get_or_create(ADMIN_USER_ID)

    assert pref.email_enabled is True
    assert pref.slack_enabled is False
    assert pref.slack_webhook_url is None
    assert pref.events == DEFAULT_EVENTS


@pytest.mark.asyncio
async def test_get_or_create_idempotent(db_session_with_users):
    """同じユーザーで複数回呼んでもレコードは1件"""
    svc = NotificationPreferenceService(db_session_with_users)
    pref1 = await svc.get_or_create(ADMIN_USER_ID)
    pref2 = await svc.get_or_create(ADMIN_USER_ID)

    # 同じ内容が返る
    assert pref1.email_enabled == pref2.email_enabled
    assert pref1.events == pref2.events


@pytest.mark.asyncio
async def test_update_preferences_partial(db_session_with_users):
    """部分更新: email_enabled のみ変更"""
    svc = NotificationPreferenceService(db_session_with_users)
    await svc.get_or_create(ADMIN_USER_ID)

    data = NotificationPreferenceUpdate(email_enabled=False)
    updated = await svc.update_preferences(ADMIN_USER_ID, data)

    assert updated.email_enabled is False
    assert updated.slack_enabled is False  # 変更されていない
    assert updated.events == DEFAULT_EVENTS  # 変更されていない


@pytest.mark.asyncio
async def test_update_preferences_events_full_replace(db_session_with_users):
    """events は完全置換される"""
    svc = NotificationPreferenceService(db_session_with_users)
    await svc.get_or_create(ADMIN_USER_ID)

    new_events = {
        "daily_report_submitted": {"email": False, "slack": True},
    }
    data = NotificationPreferenceUpdate(events=new_events)
    updated = await svc.update_preferences(ADMIN_USER_ID, data)

    assert updated.events == new_events
    assert "safety_incident_created" not in updated.events


@pytest.mark.asyncio
async def test_update_preferences_creates_if_missing(db_session_with_users):
    """update_preferences でもレコードが無ければ自動生成"""
    svc = NotificationPreferenceService(db_session_with_users)
    data = NotificationPreferenceUpdate(slack_enabled=True)
    updated = await svc.update_preferences(VIEWER_USER_ID, data)

    assert updated.slack_enabled is True
    # デフォルト値が適用されている
    assert updated.email_enabled is True
    assert updated.events == DEFAULT_EVENTS


@pytest.mark.asyncio
async def test_update_preferences_slack_webhook(db_session_with_users):
    """Slack Webhook URL の設定"""
    svc = NotificationPreferenceService(db_session_with_users)
    webhook = "https://example.com/webhook/notification-test"
    data = NotificationPreferenceUpdate(
        slack_enabled=True,
        slack_webhook_url=webhook,  # type: ignore[arg-type]
    )
    updated = await svc.update_preferences(ADMIN_USER_ID, data)

    assert updated.slack_enabled is True
    assert updated.slack_webhook_url == webhook


@pytest.mark.asyncio
async def test_users_have_isolated_preferences(db_session_with_users):
    """ユーザーごとに設定が分離されている"""
    svc = NotificationPreferenceService(db_session_with_users)

    await svc.update_preferences(
        ADMIN_USER_ID,
        NotificationPreferenceUpdate(email_enabled=False),
    )
    await svc.update_preferences(
        VIEWER_USER_ID,
        NotificationPreferenceUpdate(slack_enabled=True),
    )

    admin_pref = await svc.get_or_create(ADMIN_USER_ID)
    viewer_pref = await svc.get_or_create(VIEWER_USER_ID)

    assert admin_pref.email_enabled is False
    assert admin_pref.slack_enabled is False
    assert viewer_pref.email_enabled is True
    assert viewer_pref.slack_enabled is True
