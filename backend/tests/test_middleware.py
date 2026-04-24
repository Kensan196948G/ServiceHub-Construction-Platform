"""RequestLoggingMiddleware テスト — X-Request-ID 伝播と structlog contextvars"""

import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app
from app.middleware.logging import _extract_user_id


@pytest.mark.asyncio
async def test_request_id_generated_when_absent():
    """X-Request-ID ヘッダが無い場合、レスポンスに新規 UUID が付与される"""
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        response = await client.get("/health/live")
    assert "X-Request-ID" in response.headers
    rid = response.headers["X-Request-ID"]
    # UUID4 形式 (8-4-4-4-12)
    assert len(rid) == 36
    assert rid.count("-") == 4


@pytest.mark.asyncio
async def test_request_id_propagated_from_client():
    """クライアントが X-Request-ID を送ると同じ値がレスポンスに返る (upstream 伝播)"""
    upstream_id = "test-correlation-id-12345"
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        response = await client.get(
            "/health/live", headers={"X-Request-ID": upstream_id}
        )
    assert response.headers.get("X-Request-ID") == upstream_id


@pytest.mark.asyncio
async def test_request_id_on_api_endpoint():
    """API エンドポイントでも X-Request-ID がレスポンスヘッダに含まれる"""
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        response = await client.get("/api/v1/status")
    assert "X-Request-ID" in response.headers


@pytest.mark.asyncio
async def test_skip_paths_no_verbose_logging():
    """/health/* と /metrics は SKIP_PATHS に含まれ、200 を返す"""
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        live_resp = await client.get("/health/live")
        health_resp = await client.get("/health")
    assert live_resp.status_code == 200
    assert health_resp.status_code == 200
    # Both still get X-Request-ID even on skip paths
    assert "X-Request-ID" in live_resp.headers
    assert "X-Request-ID" in health_resp.headers


def test_extract_user_id_no_header():
    """Authorization ヘッダなし → None を返す"""
    assert _extract_user_id(None) is None
    assert _extract_user_id("") is None


def test_extract_user_id_non_bearer():
    """Bearer 以外の scheme → None を返す"""
    assert _extract_user_id("Basic dXNlcjpwYXNz") is None


def test_extract_user_id_invalid_token():
    """不正な JWT → None を返す (auth フローを妨げない)"""
    assert _extract_user_id("Bearer not.a.valid.jwt") is None


def test_extract_user_id_valid_token():
    """有効な JWT から sub クレームを取得する"""
    from app.core.security import create_access_token

    token = create_access_token("test-user-uuid", "ADMIN")
    result = _extract_user_id(f"Bearer {token}")
    assert result == "test-user-uuid"
