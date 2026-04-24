"""基本テスト - APIヘルスチェック確認"""

from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app


@pytest.mark.asyncio
async def test_health_check():
    """後方互換 /health エンドポイントの確認"""
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        response = await client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["service"] == "servicehub-api"


@pytest.mark.asyncio
async def test_api_status():
    """APIステータスエンドポイントの確認"""
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        response = await client.get("/api/v1/status")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "ServiceHub" in data["data"]["api"]


@pytest.mark.asyncio
async def test_health_live():
    """/health/live は DB/Redis なしで 200 を返す (liveness probe)"""
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        response = await client.get("/health/live")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "alive"
    assert data["service"] == "servicehub-api"


def _make_engine_mock(execute_side_effect=None):
    """AsyncEngine.connect() async context manager を模倣するモックを返す。

    AsyncEngine.connect は read-only 属性のため engine オブジェクト全体を差し替える。
    """
    mock_conn = AsyncMock()
    if execute_side_effect:
        mock_conn.execute = AsyncMock(side_effect=execute_side_effect)
    else:
        mock_conn.execute = AsyncMock()

    # async with engine.connect() as conn: に対応する context manager
    mock_ctx = AsyncMock()
    mock_ctx.__aenter__ = AsyncMock(return_value=mock_conn)
    mock_ctx.__aexit__ = AsyncMock(return_value=False)

    mock_engine = MagicMock()
    mock_engine.connect = MagicMock(return_value=mock_ctx)
    return mock_engine


@pytest.mark.asyncio
async def test_health_ready_ok():
    """/health/ready は DB+Redis 正常時に 200 を返す (readiness probe)"""
    mock_engine = _make_engine_mock()

    mock_redis = AsyncMock()
    mock_redis.ping = AsyncMock(return_value=True)

    with (
        patch("app.main.engine", mock_engine),
        patch("app.core.redis_client.get_redis", return_value=mock_redis),
    ):
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as client:
            response = await client.get("/health/ready")

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ready"


@pytest.mark.asyncio
async def test_health_ready_db_failure():
    """/health/ready は DB 接続失敗時に 503 を返す"""
    mock_engine = _make_engine_mock(execute_side_effect=Exception("connection refused"))

    with patch("app.main.engine", mock_engine):
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as client:
            response = await client.get("/health/ready")

    assert response.status_code == 503
    assert "db_not_ready" in response.json()["error"]["message"]


@pytest.mark.asyncio
async def test_health_ready_redis_failure():
    """/health/ready は Redis ping 失敗時に 503 を返す"""
    mock_engine = _make_engine_mock()

    mock_redis = AsyncMock()
    mock_redis.ping = AsyncMock(side_effect=Exception("redis timeout"))

    with (
        patch("app.main.engine", mock_engine),
        patch("app.core.redis_client.get_redis", return_value=mock_redis),
    ):
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as client:
            response = await client.get("/health/ready")

    assert response.status_code == 503
    assert "redis_not_ready" in response.json()["error"]["message"]
