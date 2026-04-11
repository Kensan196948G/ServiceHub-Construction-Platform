"""Phase 2f — retry 自動起動 + POST /notifications/retry エンドポイントのユニットテスト

- POST /api/v1/notifications/retry エンドポイントの動作検証 (ADMIN only)
- リトライ対象あり/なし、permanent 除外の確認
"""

from __future__ import annotations

import pytest

from app.repositories.notification_delivery import NotificationDeliveryRepository
from tests.conftest import ADMIN_USER_ID

# ── ヘルパ ────────────────────────────────────────────────────────


async def _make_delivery(
    db,
    *,
    status: str = "PENDING",
    failure_kind: str | None = None,
    attempts: int = 0,
    channel: str = "EMAIL",
) -> object:
    repo = NotificationDeliveryRepository(db)
    d = await repo.create_pending(
        user_id=ADMIN_USER_ID,
        event_key="daily_report_submitted",
        channel=channel,
        subject="retry test",
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


# ── POST /notifications/retry エンドポイント ──────────────────────


@pytest.mark.asyncio
async def test_retry_endpoint_returns_200_for_admin(auth_client, admin_headers):
    """ADMIN が POST /notifications/retry を呼ぶと 200 が返る。"""
    resp = await auth_client.post("/api/v1/notifications/retry", headers=admin_headers)
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert "retried_count" in data
    assert "message" in data


@pytest.mark.asyncio
async def test_retry_endpoint_forbidden_for_viewer(auth_client, viewer_headers):
    """VIEWER は POST /notifications/retry で 403 が返る。"""
    resp = await auth_client.post("/api/v1/notifications/retry", headers=viewer_headers)
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_retry_endpoint_reports_zero_when_no_retryable(
    auth_client, admin_headers
):
    """リトライ対象がない場合は retried_count=0 が返る。"""
    resp = await auth_client.post("/api/v1/notifications/retry", headers=admin_headers)
    assert resp.status_code == 200
    assert resp.json()["data"]["retried_count"] == 0


@pytest.mark.asyncio
async def test_retry_endpoint_skips_permanent_failures(
    db_session_with_users, auth_client, admin_headers
):
    """permanent 失敗行は POST /retry でスキップされる (retried_count=0)。"""
    await _make_delivery(
        db_session_with_users, status="FAILED", failure_kind="permanent", attempts=1
    )
    await db_session_with_users.commit()

    resp = await auth_client.post("/api/v1/notifications/retry", headers=admin_headers)
    assert resp.status_code == 200
    assert resp.json()["data"]["retried_count"] == 0


@pytest.mark.asyncio
async def test_retry_endpoint_unauthenticated_returns_401(auth_client):
    """認証なしは 401 が返る。"""
    resp = await auth_client.post("/api/v1/notifications/retry")
    assert resp.status_code == 401
