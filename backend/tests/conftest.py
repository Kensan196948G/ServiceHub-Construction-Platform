"""
pytest共通フィクスチャ
SQLite(aiosqlite)をインメモリDBとして使用
"""

from __future__ import annotations

import asyncio
import uuid

import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from sqlalchemy.pool import StaticPool

from app.core.rbac import UserRole
from app.core.security import create_access_token
from app.db.base import Base, get_db
from app.main import app

# SQLite インメモリDB（CI/CDテスト用）
TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

test_engine = create_async_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestSessionLocal = async_sessionmaker(test_engine, expire_on_commit=False)


@pytest_asyncio.fixture(scope="session")
def event_loop():
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


@pytest_asyncio.fixture(scope="session")
async def db_tables():
    """テスト用テーブル作成"""
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest_asyncio.fixture
async def db_session(db_tables):
    """各テスト用DBセッション（ロールバック保証）"""
    async with TestSessionLocal() as session:
        yield session
        await session.rollback()


@pytest_asyncio.fixture
async def client(db_session):
    """テスト用HTTPクライアント（DBオーバーライド）"""

    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as c:
        yield c
    app.dependency_overrides.clear()


def make_token(role: UserRole = UserRole.ADMIN, user_id: str | None = None) -> str:
    uid = user_id or str(uuid.uuid4())
    return create_access_token({"sub": uid, "role": role.value, "username": "testuser"})


@pytest_asyncio.fixture
def admin_headers() -> dict:
    return {"Authorization": f"Bearer {make_token(UserRole.ADMIN)}"}


@pytest_asyncio.fixture
def pm_headers() -> dict:
    return {"Authorization": f"Bearer {make_token(UserRole.PROJECT_MANAGER)}"}


@pytest_asyncio.fixture
def it_headers() -> dict:
    return {"Authorization": f"Bearer {make_token(UserRole.IT_OPERATOR)}"}


@pytest_asyncio.fixture
def viewer_headers() -> dict:
    return {"Authorization": f"Bearer {make_token(UserRole.VIEWER)}"}
