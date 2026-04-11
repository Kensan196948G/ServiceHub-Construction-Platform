"""notification_hook ユニットテスト

resolve_recipients() と fire_notification_hook() の動作を検証する。
UserRepository をフェイク化してDB不要で実行できる。
"""

from __future__ import annotations

import uuid
from unittest.mock import AsyncMock, MagicMock

import pytest

from app.services.notification_hook import (
    _EVENT_ROLES,
    fire_notification_hook,
    resolve_recipients,
)

# ----- helpers ---------------------------------------------------------------

ADMIN_ID = uuid.UUID("11111111-1111-1111-1111-111111111111")
PM_ID = uuid.UUID("22222222-2222-2222-2222-222222222222")
VIEWER_ID = uuid.UUID("33333333-3333-3333-3333-333333333333")


def _make_db_with_ids(ids: list[uuid.UUID]) -> AsyncMock:
    """get_ids_by_roles が ids を返す stub DB セッション。"""
    db = AsyncMock()
    # UserRepository(db).get_ids_by_roles を間接的に呼ぶので
    # execute() → scalars().all() チェーンをモックする
    scalars_mock = MagicMock()
    scalars_mock.all.return_value = ids
    execute_result = MagicMock()
    execute_result.scalars.return_value = scalars_mock
    db.execute = AsyncMock(return_value=execute_result)
    return db


# ----- resolve_recipients ----------------------------------------------------


@pytest.mark.asyncio
async def test_resolve_recipients_explicit_user_ids_bypasses_db():
    """explicit_user_ids が指定されていれば DB を呼ばない。"""
    db = AsyncMock()
    ids = [ADMIN_ID, PM_ID]

    result = await resolve_recipients(
        db, "daily_report_submitted", explicit_user_ids=ids
    )

    assert result == ids
    db.execute.assert_not_called()


@pytest.mark.asyncio
async def test_resolve_recipients_uses_role_mapping():
    """ロールマッピングに従って DB から ID を取得する。"""
    db = _make_db_with_ids([ADMIN_ID, PM_ID])

    result = await resolve_recipients(db, "daily_report_submitted")

    assert ADMIN_ID in result
    assert PM_ID in result


@pytest.mark.asyncio
async def test_resolve_recipients_incident_assigned_returns_empty_without_explicit():
    """incident_assigned はロールリストが空のため、explicit_user_ids 必須。"""
    db = _make_db_with_ids([])

    result = await resolve_recipients(db, "incident_assigned")

    assert result == []


@pytest.mark.asyncio
async def test_resolve_recipients_unknown_event_defaults_to_admin():
    """未知のイベントキーはデフォルト ADMIN ロールにフォールバック。"""
    db = _make_db_with_ids([ADMIN_ID])

    result = await resolve_recipients(db, "unknown_event_xyz")

    assert result == [ADMIN_ID]


# ----- fire_notification_hook ------------------------------------------------


@pytest.mark.asyncio
async def test_fire_notification_hook_schedules_when_recipients_exist(monkeypatch):
    """受信者がいる場合 schedule_notification を呼ぶ。"""
    db = _make_db_with_ids([ADMIN_ID])
    background_tasks = MagicMock()

    scheduled_calls: list[dict] = []

    def _fake_schedule(bt, *, event_key, user_ids, context):
        scheduled_calls.append(
            {"event_key": event_key, "user_ids": user_ids, "context": context}
        )

    monkeypatch.setattr(
        "app.services.notification_hook.schedule_notification", _fake_schedule
    )

    await fire_notification_hook(
        background_tasks,
        db,
        event_key="daily_report_submitted",
        context={"report_id": "r1"},
    )

    assert len(scheduled_calls) == 1
    assert scheduled_calls[0]["event_key"] == "daily_report_submitted"
    assert ADMIN_ID in scheduled_calls[0]["user_ids"]


@pytest.mark.asyncio
async def test_fire_notification_hook_noop_when_no_recipients(monkeypatch):
    """受信者が 0 名の場合 schedule_notification を呼ばない。"""
    db = _make_db_with_ids([])
    background_tasks = MagicMock()

    scheduled_calls: list[dict] = []

    def _fake_schedule(bt, *, event_key, user_ids, context):
        scheduled_calls.append({})

    monkeypatch.setattr(
        "app.services.notification_hook.schedule_notification", _fake_schedule
    )

    # incident_assigned without explicit_user_ids → no recipients
    await fire_notification_hook(
        background_tasks,
        db,
        event_key="incident_assigned",
        context={"incident_id": "i1"},
    )

    assert scheduled_calls == []


@pytest.mark.asyncio
async def test_fire_notification_hook_explicit_user_ids(monkeypatch):
    """explicit_user_ids を指定した場合そのまま渡される。"""
    db = AsyncMock()
    db.execute = AsyncMock()
    background_tasks = MagicMock()
    assignee_id = uuid.uuid4()

    captured_ids: list[list[uuid.UUID]] = []

    def _fake_schedule(bt, *, event_key, user_ids, context):
        captured_ids.append(user_ids)

    monkeypatch.setattr(
        "app.services.notification_hook.schedule_notification", _fake_schedule
    )

    await fire_notification_hook(
        background_tasks,
        db,
        event_key="incident_assigned",
        context={"incident_id": "i1", "assignee_name": "Alice"},
        explicit_user_ids=[assignee_id],
    )

    assert captured_ids == [[assignee_id]]
    # DB は呼ばれていない
    db.execute.assert_not_called()


# ----- _EVENT_ROLES sanity check ---------------------------------------------


def test_event_roles_mapping_covers_all_five_events():
    """設計書 §9.6 の 5 イベント種別がすべてマッピングに存在する。"""
    expected = {
        "daily_report_submitted",
        "safety_incident_created",
        "change_request_pending_approval",
        "incident_assigned",
        "project_status_changed",
    }
    assert expected.issubset(set(_EVENT_ROLES.keys()))
