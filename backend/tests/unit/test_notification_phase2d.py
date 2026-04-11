"""Phase 2d — リトライ機構 + failure_kind 保存 + ADMIN 配信履歴 API のユニットテスト"""

from __future__ import annotations

import pytest

from app.models.notification_delivery import NotificationDelivery
from app.repositories.notification_delivery import (
    MAX_RETRY_ATTEMPTS,
    NotificationDeliveryRepository,
)
from tests.conftest import ADMIN_USER_ID

# ── ヘルパ ────────────────────────────────────────────────────────


async def _make_delivery(
    db,
    *,
    status: str = "PENDING",
    channel: str = "EMAIL",
    failure_kind: str | None = None,
    attempts: int = 0,
    event_key: str = "daily_report_submitted",
) -> NotificationDelivery:
    repo = NotificationDeliveryRepository(db)
    d = await repo.create_pending(
        user_id=ADMIN_USER_ID,
        event_key=event_key,
        channel=channel,
        subject="test subject",
        body_preview="preview",
    )
    if status != "PENDING":
        d.status = status
    if failure_kind is not None:
        d.failure_kind = failure_kind
    d.attempts = attempts
    await db.flush()
    await db.refresh(d)
    return d


# ── failure_kind 保存 ─────────────────────────────────────────────


@pytest.mark.asyncio
async def test_mark_failed_saves_failure_kind_transient(db_session_with_users):
    """mark_failed に transient を渡すと DB に保存される。"""
    repo = NotificationDeliveryRepository(db_session_with_users)
    d = await _make_delivery(db_session_with_users)

    await repo.mark_failed(d, "connection refused", failure_kind="transient")

    assert d.status == "FAILED"
    assert d.failure_kind == "transient"
    assert d.attempts == 1


@pytest.mark.asyncio
async def test_mark_failed_saves_failure_kind_permanent(db_session_with_users):
    """mark_failed に permanent を渡すと DB に保存される。"""
    repo = NotificationDeliveryRepository(db_session_with_users)
    d = await _make_delivery(db_session_with_users)

    await repo.mark_failed(d, "550 invalid user", failure_kind="permanent")

    assert d.failure_kind == "permanent"


@pytest.mark.asyncio
async def test_mark_failed_without_failure_kind_stores_none(db_session_with_users):
    """failure_kind 省略時は None のまま (後方互換)。"""
    repo = NotificationDeliveryRepository(db_session_with_users)
    d = await _make_delivery(db_session_with_users)

    await repo.mark_failed(d, "unknown")

    assert d.failure_kind is None


@pytest.mark.asyncio
async def test_mark_sent_clears_failure_kind(db_session_with_users):
    """mark_sent は failure_kind を None にリセットする。"""
    repo = NotificationDeliveryRepository(db_session_with_users)
    d = await _make_delivery(db_session_with_users)

    await repo.mark_sent(d)

    assert d.failure_kind is None


# ── list_retryable ────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_list_retryable_returns_transient_failed(db_session_with_users):
    """FAILED + transient + attempts < max は list_retryable に含まれる。"""
    repo = NotificationDeliveryRepository(db_session_with_users)
    d = await _make_delivery(
        db_session_with_users,
        status="FAILED",
        failure_kind="transient",
        attempts=1,
    )

    result = await repo.list_retryable()

    ids = [r.id for r in result]
    assert d.id in ids


@pytest.mark.asyncio
async def test_list_retryable_excludes_permanent(db_session_with_users):
    """FAILED + permanent は list_retryable に含まれない。"""
    repo = NotificationDeliveryRepository(db_session_with_users)
    d = await _make_delivery(
        db_session_with_users,
        status="FAILED",
        failure_kind="permanent",
        attempts=1,
    )

    result = await repo.list_retryable()

    ids = [r.id for r in result]
    assert d.id not in ids


@pytest.mark.asyncio
async def test_list_retryable_excludes_max_attempts(db_session_with_users):
    """attempts == MAX_RETRY_ATTEMPTS のものは list_retryable に含まれない。"""
    repo = NotificationDeliveryRepository(db_session_with_users)
    d = await _make_delivery(
        db_session_with_users,
        status="FAILED",
        failure_kind="transient",
        attempts=MAX_RETRY_ATTEMPTS,
    )

    result = await repo.list_retryable()

    ids = [r.id for r in result]
    assert d.id not in ids


@pytest.mark.asyncio
async def test_list_retryable_excludes_sent(db_session_with_users):
    """SENT 行は list_retryable に含まれない。"""
    repo = NotificationDeliveryRepository(db_session_with_users)
    d = await _make_delivery(
        db_session_with_users,
        status="SENT",
        failure_kind="transient",
        attempts=1,
    )

    result = await repo.list_retryable()

    ids = [r.id for r in result]
    assert d.id not in ids


# ── mark_retry_pending ────────────────────────────────────────────


@pytest.mark.asyncio
async def test_mark_retry_pending_resets_status(db_session_with_users):
    """FAILED 行を mark_retry_pending すると PENDING に戻る。"""
    repo = NotificationDeliveryRepository(db_session_with_users)
    d = await _make_delivery(
        db_session_with_users,
        status="FAILED",
        failure_kind="transient",
        attempts=1,
    )

    await repo.mark_retry_pending(d)

    assert d.status == "PENDING"
    assert d.failure_kind is None
    assert d.error_detail is None
    # attempts はそのまま保持 (mark_sent/mark_failed でインクリメント)
    assert d.attempts == 1


@pytest.mark.asyncio
async def test_mark_retry_pending_noop_on_sent(db_session_with_users):
    """SENT 行を mark_retry_pending しても変化しない。"""
    repo = NotificationDeliveryRepository(db_session_with_users)
    d = await _make_delivery(db_session_with_users, status="SENT", attempts=1)

    await repo.mark_retry_pending(d)

    assert d.status == "SENT"


# ── list_for_admin / count_for_admin ─────────────────────────────


@pytest.mark.asyncio
async def test_list_for_admin_returns_all(db_session_with_users):
    """フィルタなしで全件取得できる。"""
    repo = NotificationDeliveryRepository(db_session_with_users)
    for _ in range(3):
        await _make_delivery(db_session_with_users)

    result = await repo.list_for_admin(limit=10)
    count = await repo.count_for_admin()

    assert len(result) >= 3
    assert count >= 3


@pytest.mark.asyncio
async def test_list_for_admin_filter_by_status(db_session_with_users):
    """status フィルタが機能する。"""
    repo = NotificationDeliveryRepository(db_session_with_users)
    # FAILED 行を 2 件作成
    for _ in range(2):
        d = await _make_delivery(db_session_with_users)
        await repo.mark_failed(d, "err", failure_kind="transient")

    result = await repo.list_for_admin(status="FAILED", limit=10)

    assert all(r.status == "FAILED" for r in result)
    assert len(result) >= 2


@pytest.mark.asyncio
async def test_list_for_admin_filter_by_channel(db_session_with_users):
    """channel フィルタが機能する。"""
    repo = NotificationDeliveryRepository(db_session_with_users)
    await _make_delivery(db_session_with_users, channel="EMAIL")
    await _make_delivery(db_session_with_users, channel="SLACK")

    result = await repo.list_for_admin(channel="SLACK", limit=10)

    assert all(r.channel == "SLACK" for r in result)


@pytest.mark.asyncio
async def test_list_for_admin_pagination(db_session_with_users):
    """ページネーションが機能する (limit/offset)。"""
    repo = NotificationDeliveryRepository(db_session_with_users)
    for _ in range(5):
        await _make_delivery(db_session_with_users)

    page1 = await repo.list_for_admin(offset=0, limit=3)
    page2 = await repo.list_for_admin(offset=3, limit=3)

    assert len(page1) == 3
    # page1 と page2 の id が重複しないこと
    ids1 = {r.id for r in page1}
    ids2 = {r.id for r in page2}
    assert ids1.isdisjoint(ids2)
