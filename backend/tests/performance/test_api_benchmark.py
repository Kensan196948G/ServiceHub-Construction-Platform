"""
API パフォーマンスベースライン計測 (Phase 3a)

pytest-benchmark を使って重要エンドポイントの応答時間ベースラインを計測する。
これらのテストは通常の CI では --benchmark-disable フラグで無効化し、
定期的なパフォーマンス計測時のみ実行する。

実行方法:
  # ベンチマーク有効（ベースライン計測）
  pytest tests/performance/test_api_benchmark.py -v

  # 通常テスト（ベンチマーク無効・高速）
  pytest tests/performance/test_api_benchmark.py --benchmark-disable
"""

from __future__ import annotations

import asyncio

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from sqlalchemy.pool import StaticPool

from app.db.base import Base, get_db
from app.main import app

_BENCH_DATABASE_URL = "sqlite+aiosqlite:///:memory:"


@pytest.fixture
def bench_client():
    """Sync fixture with explicit event loop management.

    Uses @pytest.fixture (not @pytest_asyncio.fixture) to avoid event loop
    conflicts with pytest-asyncio 0.24 function-scoped loop management when
    asyncio_mode='auto' is set. The event loop is created here and stored
    on the client so _sync_get can reuse the exact same loop.
    """
    loop = asyncio.new_event_loop()

    async def _create() -> tuple[AsyncClient, object]:
        engine = create_async_engine(
            _BENCH_DATABASE_URL,
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        session_factory = async_sessionmaker(engine, expire_on_commit=False)

        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)

        async def _override_get_db():
            async with session_factory() as session:
                yield session

        app.dependency_overrides[get_db] = _override_get_db
        client = AsyncClient(transport=ASGITransport(app=app), base_url="http://test")
        await client.__aenter__()
        return client, engine

    client, engine = loop.run_until_complete(_create())
    # Attach the loop so _sync_get can reuse the exact same loop.
    client._bench_loop = loop  # type: ignore[attr-defined]
    yield client

    async def _destroy() -> None:
        await client.__aexit__(None, None, None)
        app.dependency_overrides.clear()
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.drop_all)
        await engine.dispose()

    loop.run_until_complete(_destroy())
    loop.close()


def _sync_get(client: AsyncClient, url: str) -> int:
    """Run an async GET using the fixture's dedicated event loop."""
    loop: asyncio.AbstractEventLoop = client._bench_loop  # type: ignore[attr-defined]
    return loop.run_until_complete(client.get(url, follow_redirects=True)).status_code


@pytest.mark.benchmark(group="health", min_rounds=10)
def test_benchmark_health_check(benchmark, bench_client):
    """GET /health — ヘルスチェック応答時間ベースライン。

    目標: p95 < 10ms (インメモリDB / ローカル ASGI)
    """
    status = benchmark(lambda: _sync_get(bench_client, "/health"))
    assert status == 200


@pytest.mark.benchmark(group="health", min_rounds=10)
def test_benchmark_metrics_endpoint(benchmark, bench_client):
    """GET /metrics — Prometheus メトリクスエンドポイント応答時間。

    目標: p95 < 50ms (Prometheus registry シリアライズを含む)
    """
    status = benchmark(lambda: _sync_get(bench_client, "/metrics"))
    assert status == 200


@pytest.mark.benchmark(group="auth", min_rounds=5)
def test_benchmark_unauthenticated_protected(benchmark, bench_client):
    """GET /api/v1/projects/ unauthenticated — 401 高速返却の確認。

    認証ミドルウェアのオーバーヘッドを計測。目標: p95 < 20ms
    """
    status = benchmark(lambda: _sync_get(bench_client, "/api/v1/projects/"))
    assert status == 401
