"""Phase 2e — audit_logs 統合のユニットテスト

GET /api/v1/notifications/deliveries (ADMIN専用) へのアクセスが
audit_logs テーブルに正しく記録されることを検証する。
"""

from __future__ import annotations

import pytest

from app.repositories.audit_log import AuditLogRepository
from tests.conftest import ADMIN_USER_ID

# ── AuditLogRepository 単体テスト ─────────────────────────────────


@pytest.mark.asyncio
async def test_audit_log_create_stores_action_and_resource(db_session_with_users):
    """create() で action / resource が正しく保存される。"""
    repo = AuditLogRepository(db_session_with_users)

    log = await repo.create(
        action="READ",
        resource="notification_deliveries",
        user_id=ADMIN_USER_ID,
    )

    assert log.id is not None
    assert log.action == "READ"
    assert log.resource == "notification_deliveries"
    assert log.user_id == ADMIN_USER_ID


@pytest.mark.asyncio
async def test_audit_log_create_stores_ip_and_user_agent(db_session_with_users):
    """create() で ip_address / user_agent が記録される。"""
    repo = AuditLogRepository(db_session_with_users)

    log = await repo.create(
        action="READ",
        resource="notification_deliveries",
        user_id=ADMIN_USER_ID,
        ip_address="192.0.2.1",
        user_agent="pytest-client/1.0",
    )

    assert log.ip_address == "192.0.2.1"
    assert log.user_agent == "pytest-client/1.0"


@pytest.mark.asyncio
async def test_audit_log_create_stores_after_data_metadata(db_session_with_users):
    """create() で after_data (クエリパラメータメタ情報) が記録される。"""
    repo = AuditLogRepository(db_session_with_users)
    meta = {
        "page": 1,
        "per_page": 20,
        "filter_status": "FAILED",
        "filter_channel": None,
        "filter_event_key": None,
        "filter_user_id": None,
        "total_returned": 5,
    }

    log = await repo.create(
        action="READ",
        resource="notification_deliveries",
        user_id=ADMIN_USER_ID,
        after_data=meta,
    )

    assert log.after_data["filter_status"] == "FAILED"
    assert log.after_data["total_returned"] == 5
    assert log.before_data is None


@pytest.mark.asyncio
async def test_audit_log_create_allows_null_user_id(db_session_with_users):
    """user_id = None (システム操作) でも create() が成功する。"""
    repo = AuditLogRepository(db_session_with_users)

    log = await repo.create(
        action="READ",
        resource="notification_deliveries",
    )

    assert log.user_id is None
    assert log.action == "READ"
