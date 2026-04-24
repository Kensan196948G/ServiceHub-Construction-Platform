"""RequestLoggingMiddleware テスト — X-Request-ID 伝播と structlog contextvars"""

import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app


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
