"""NotificationDeliveryRepository の冪等性 + サニタイズ (Codex review fix)"""

import uuid

import pytest
from sqlalchemy import select

from app.models.notification_delivery import NotificationDelivery
from app.repositories.notification_delivery import (
    NotificationDeliveryRepository,
    _sanitize_error_detail,
)
from tests.conftest import ADMIN_USER_ID


async def _make_pending(
    db_session_with_users, user_id=ADMIN_USER_ID
) -> NotificationDelivery:
    repo = NotificationDeliveryRepository(db_session_with_users)
    return await repo.create_pending(
        user_id=user_id,
        event_key="x",
        channel="EMAIL",
        subject="s",
        body_preview="b",
    )


@pytest.mark.asyncio
async def test_mark_sent_is_idempotent(db_session_with_users):
    """mark_sent を複数回呼んでも attempts は 1 のまま、状態も保たれる。"""
    repo = NotificationDeliveryRepository(db_session_with_users)
    delivery = await _make_pending(db_session_with_users)

    await repo.mark_sent(delivery)
    first_sent_at = delivery.sent_at
    assert delivery.status == "SENT"
    assert delivery.attempts == 1

    # 2 回目呼び出しは no-op (PENDING ではないため)
    await repo.mark_sent(delivery)
    assert delivery.status == "SENT"
    assert delivery.attempts == 1  # NOT 2
    assert delivery.sent_at == first_sent_at  # 上書きされない


@pytest.mark.asyncio
async def test_mark_failed_is_idempotent(db_session_with_users):
    repo = NotificationDeliveryRepository(db_session_with_users)
    delivery = await _make_pending(db_session_with_users)

    await repo.mark_failed(delivery, "first error")
    assert delivery.status == "FAILED"
    assert delivery.attempts == 1
    first_error = delivery.error_detail

    await repo.mark_failed(delivery, "second error")
    assert delivery.status == "FAILED"
    assert delivery.attempts == 1
    assert delivery.error_detail == first_error  # 上書きされない


@pytest.mark.asyncio
async def test_mark_failed_after_mark_sent_is_noop(db_session_with_users):
    """mark_sent 後に mark_failed を呼んでも SENT 状態は破壊されない。"""
    repo = NotificationDeliveryRepository(db_session_with_users)
    delivery = await _make_pending(db_session_with_users)

    await repo.mark_sent(delivery)
    await repo.mark_failed(delivery, "should not apply")
    assert delivery.status == "SENT"
    assert delivery.attempts == 1
    assert delivery.error_detail is None


@pytest.mark.asyncio
async def test_mark_sent_after_mark_failed_is_noop(db_session_with_users):
    repo = NotificationDeliveryRepository(db_session_with_users)
    delivery = await _make_pending(db_session_with_users)

    await repo.mark_failed(delivery, "boom")
    await repo.mark_sent(delivery)
    assert delivery.status == "FAILED"
    assert delivery.sent_at is None


# ── サニタイザ単体 ──────────────────────────────────────────────


def test_sanitize_removes_email_addresses():
    raw = (
        "SMTPRecipientsRefused: recipient user@example.com rejected by "
        "admin@example.com server"
    )
    cleaned = _sanitize_error_detail(raw)
    assert "user@example.com" not in cleaned
    assert "admin@example.com" not in cleaned
    assert "[redacted-email]" in cleaned
    assert "SMTPRecipientsRefused" in cleaned  # exception type 情報は残す


def test_sanitize_redacts_smtp_response_detail():
    raw = "SMTPResponseException: 550 5.1.1 User unknown in virtual mailbox table"
    cleaned = _sanitize_error_detail(raw)
    # SMTP code は残す
    assert "550" in cleaned or "5.1.1" in cleaned
    # server-supplied detail は削除される
    assert "User unknown" not in cleaned
    assert "[redacted]" in cleaned


def test_sanitize_caps_length_at_1000():
    raw = "X" * 5000
    cleaned = _sanitize_error_detail(raw)
    assert len(cleaned) <= 1000


def test_sanitize_preserves_exception_type_name():
    raw = "ConnectionRefusedError: refused"
    cleaned = _sanitize_error_detail(raw)
    assert "ConnectionRefusedError" in cleaned


@pytest.mark.asyncio
async def test_mark_failed_sanitizes_error_detail_in_db(db_session_with_users):
    """end-to-end: mark_failed 経由で DB に保存された値がサニタイズ済み。"""
    repo = NotificationDeliveryRepository(db_session_with_users)
    delivery = await _make_pending(db_session_with_users)

    await repo.mark_failed(
        delivery,
        "SMTPRecipientsRefused: leaked@test.example.com rejected",
    )

    # 実際に DB から再取得して検証
    result = await db_session_with_users.execute(
        select(NotificationDelivery).where(NotificationDelivery.id == delivery.id)
    )
    row = result.scalar_one()
    assert "leaked@test.example.com" not in (row.error_detail or "")
    assert "[redacted-email]" in (row.error_detail or "")


@pytest.mark.asyncio
async def test_create_pending_uses_default_attempts_zero(db_session_with_users):
    delivery = await _make_pending(db_session_with_users)
    assert delivery.attempts == 0
    assert delivery.status == "PENDING"
    assert delivery.sent_at is None
    assert delivery.error_detail is None
    assert isinstance(delivery.id, uuid.UUID)
