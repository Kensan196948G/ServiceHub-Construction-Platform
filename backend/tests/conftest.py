"""
pytest共通フィクスチャ
SQLite(aiosqlite)をインメモリDBとして使用
"""

from __future__ import annotations

import uuid

import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from sqlalchemy.pool import StaticPool

from app.core.rbac import UserRole
from app.core.security import create_access_token, get_password_hash
from app.db.base import Base, get_db
from app.main import app
from app.middleware.rate_limit import limiter

# SQLite インメモリDB（CI/CDテスト用）
TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

# 固定テストユーザーUUID（DBに登録するのでJWTのsubと一致させる）
ADMIN_USER_ID = uuid.UUID("00000000-0000-0000-0000-000000000001")
VIEWER_USER_ID = uuid.UUID("00000000-0000-0000-0000-000000000002")
PM_USER_ID = uuid.UUID("00000000-0000-0000-0000-000000000003")
IT_USER_ID = uuid.UUID("00000000-0000-0000-0000-000000000004")

test_engine = create_async_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestSessionLocal = async_sessionmaker(test_engine, expire_on_commit=False)


@pytest_asyncio.fixture
async def db_tables():
    """テスト用テーブル作成"""
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await test_engine.dispose()


@pytest_asyncio.fixture
async def db_session(db_tables):
    """各テスト用DBセッション（ロールバック保証）"""
    async with TestSessionLocal() as session:
        yield session
        await session.rollback()


@pytest_asyncio.fixture
async def db_session_with_users(db_tables):
    """テストユーザーを含むDBセッション（統合テスト用）"""
    from app.models.user import User

    async with TestSessionLocal() as session:
        for uid, role, name in [
            (ADMIN_USER_ID, UserRole.ADMIN, "admin"),
            (VIEWER_USER_ID, UserRole.VIEWER, "viewer"),
            (PM_USER_ID, UserRole.PROJECT_MANAGER, "pm"),
            (IT_USER_ID, UserRole.IT_OPERATOR, "it"),
        ]:
            user = User(
                id=uid,
                email=f"{name}@test.example.com",
                full_name=f"Test {name.upper()}",
                hashed_password=get_password_hash("TestPass1!"),
                role=role.value,
                is_active=True,
            )
            session.add(user)
        await session.commit()
        yield session
        await session.rollback()


@pytest_asyncio.fixture
async def client(db_session):
    """テスト用HTTPクライアント（DBオーバーライド）"""

    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
        follow_redirects=True,
    ) as c:
        yield c
    app.dependency_overrides.clear()


@pytest_asyncio.fixture
async def auth_client(db_session_with_users):
    """認証済みテスト用HTTPクライアント（統合テスト用）"""

    async def override_get_db():
        yield db_session_with_users

    app.dependency_overrides[get_db] = override_get_db
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
        follow_redirects=True,
    ) as c:
        yield c
    app.dependency_overrides.clear()


def make_token(
    role: UserRole = UserRole.ADMIN, user_id: uuid.UUID | str | None = None
) -> str:
    if user_id is None:
        uid_str = str(ADMIN_USER_ID)
    elif isinstance(user_id, uuid.UUID):
        uid_str = str(user_id)
    else:
        uid_str = user_id
    return create_access_token(uid_str, role.value)


@pytest_asyncio.fixture
def admin_headers() -> dict:
    return {"Authorization": f"Bearer {make_token(UserRole.ADMIN, ADMIN_USER_ID)}"}


@pytest_asyncio.fixture
def pm_headers() -> dict:
    token = make_token(UserRole.PROJECT_MANAGER, PM_USER_ID)
    return {"Authorization": f"Bearer {token}"}


@pytest_asyncio.fixture
def it_headers() -> dict:
    return {"Authorization": f"Bearer {make_token(UserRole.IT_OPERATOR, IT_USER_ID)}"}


@pytest_asyncio.fixture
def viewer_headers() -> dict:
    return {"Authorization": f"Bearer {make_token(UserRole.VIEWER, VIEWER_USER_ID)}"}


@pytest_asyncio.fixture(autouse=True)
async def reset_limiter():
    """Reset rate limit counters before each test to prevent cross-test leakage."""
    limiter._storage.reset()
    yield
    limiter._storage.reset()


@pytest_asyncio.fixture(autouse=True)
async def reset_redis_singleton():
    """Reset the Redis singleton between tests.

    redis_client.py uses a module-level _redis variable that is bound to the
    event loop at creation time. With asyncio_default_fixture_loop_scope=function,
    each test gets a new event loop, so the cached connection from a previous test
    would be bound to a closed loop and raise RuntimeError: Event loop is closed.
    Resetting _redis=None forces a fresh connection on the current event loop.
    """
    yield
    import app.core.redis_client as rc

    if rc._redis is not None:
        try:
            await rc._redis.aclose()
        except Exception as exc:  # noqa: BLE001
            # Ignore cleanup errors (e.g. already closed connection)
            _ = exc
        rc._redis = None
