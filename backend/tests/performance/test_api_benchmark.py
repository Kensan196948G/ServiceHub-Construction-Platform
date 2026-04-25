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
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from sqlalchemy.pool import StaticPool

from app.db.base import Base, get_db
from app.main import app

_BENCH_DATABASE_URL = "sqlite+aiosqlite:///:memory:"


@pytest_asyncio.fixture
async def bench_client():
    """Function-scoped ASGI test client with isolated in-memory DB.

    scope=module caused ScopeMismatch with pytest-asyncio 0.24 default
    function-scoped event_loop. Using function scope avoids this.
    """
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

    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        yield client

    app.dependency_overrides.clear()
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()


def _sync_get(client: AsyncClient, url: str) -> int:
    """Run an async GET in a new event loop and return the status code."""
    return asyncio.get_event_loop().run_until_complete(client.get(url)).status_code


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
