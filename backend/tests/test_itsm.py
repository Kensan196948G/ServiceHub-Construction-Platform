"""ITSM APIテスト"""
import pytest
from httpx import AsyncClient
from unittest.mock import AsyncMock, MagicMock, patch
from app.main import app
from app.core.rbac import UserRole
from app.api.v1.deps import get_current_user


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
    async with AsyncClient(app=app, base_url="http://test") as client:
        resp = await client.post("/api/v1/itsm/incidents", json={
            "title": "テスト障害",
            "description": "テスト詳細",
        })
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_list_incidents_requires_auth():
    """未認証でインシデント一覧は401"""
    async with AsyncClient(app=app, base_url="http://test") as client:
        resp = await client.get("/api/v1/itsm/incidents")
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_list_changes_requires_auth():
    """未認証で変更要求一覧は401"""
    async with AsyncClient(app=app, base_url="http://test") as client:
        resp = await client.get("/api/v1/itsm/changes")
    assert resp.status_code == 401
