"""Rate limiting tests — slowapi integration with auth endpoints."""

import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app


@pytest.mark.asyncio
async def test_rate_limiter_registered_on_app():
    """app.state.limiter が slowapi Limiter として登録されている"""
    from slowapi import Limiter

    assert hasattr(app.state, "limiter")
    assert isinstance(app.state.limiter, Limiter)


@pytest.mark.asyncio
async def test_login_rate_limit_429(client):
    """POST /api/v1/auth/login は 5 回超過で 429 を返す"""
    payload = {"email": "nonexistent@example.com", "password": "WrongPass123!"}
    responses = [
        await client.post("/api/v1/auth/login", json=payload) for _ in range(6)
    ]

    status_codes = [r.status_code for r in responses]
    # First 5 should NOT be 429 (they may be 401 from auth failure)
    assert all(sc != 429 for sc in status_codes[:5])
    # 6th request should be rate-limited
    assert responses[5].status_code == 429


@pytest.mark.asyncio
async def test_login_rate_limit_response_format(client):
    """429 レスポンスはプロジェクト統一エラー形式を返す"""
    payload = {"email": "nonexistent@example.com", "password": "WrongPass123!"}
    for _ in range(6):
        response = await client.post("/api/v1/auth/login", json=payload)

    assert response.status_code == 429
    body = response.json()
    assert body["success"] is False
    assert body["error"]["code"] == "RATE_LIMIT_EXCEEDED"
    assert "レート制限超過" in body["error"]["message"]


@pytest.mark.asyncio
async def test_refresh_rate_limit_429():
    """POST /api/v1/auth/refresh は 10 回超過で 429 を返す"""
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        payload = {"refresh_token": "invalid-token"}
        responses = [
            await client.post("/api/v1/auth/refresh", json=payload) for _ in range(11)
        ]

    status_codes = [r.status_code for r in responses]
    assert all(sc != 429 for sc in status_codes[:10])
    assert responses[10].status_code == 429


@pytest.mark.asyncio
async def test_non_auth_endpoint_no_rate_limit():
    """非認証エンドポイント (health) はレート制限を受けない"""
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        responses = [await client.get("/health/live") for _ in range(20)]

    assert all(r.status_code == 200 for r in responses)
