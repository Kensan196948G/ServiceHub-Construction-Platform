"""
JWT認証テスト
"""

import pytest
from httpx import ASGITransport, AsyncClient

from app.core.security import create_access_token, create_refresh_token, get_password_hash, verify_password
from app.main import app


def test_password_hash_and_verify():
    """パスワードハッシュ化・検証のテスト"""
    password = "TestPass123!"
    hashed = get_password_hash(password)
    assert hashed != password
    assert verify_password(password, hashed)
    assert not verify_password("wrongpassword", hashed)


def test_create_access_token():
    """アクセストークン生成テスト"""
    from app.core.security import verify_token

    token = create_access_token("user-123", "PROJECT_MANAGER")
    assert token is not None
    token_data = verify_token(token)
    assert token_data is not None
    assert token_data.sub == "user-123"
    assert token_data.role == "PROJECT_MANAGER"


@pytest.mark.asyncio
async def test_login_invalid_credentials(client):
    """無効な認証情報でのログイン失敗テスト"""
    response = await client.post(
        "/api/v1/auth/login",
        json={"email": "notexist@example.com", "password": "wrongpass123"},
    )
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_me_without_token():
    """/me エンドポイントは認証なしで401を返す"""
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        response = await client.get("/api/v1/auth/me")
    assert response.status_code == 401  # auto_error=False: 401 when no token


@pytest.mark.asyncio
async def test_login_success(auth_client):
    """有効な認証情報でのログイン成功テスト"""
    response = await auth_client.post(
        "/api/v1/auth/login",
        json={"email": "admin@test.example.com", "password": "TestPass1!"},
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["token_type"] == "bearer"


@pytest.mark.asyncio
async def test_login_viewer_success(auth_client):
    """Viewerユーザーのログイン成功"""
    response = await auth_client.post(
        "/api/v1/auth/login",
        json={"email": "viewer@test.example.com", "password": "TestPass1!"},
    )
    assert response.status_code == 200
    assert "access_token" in response.json()


@pytest.mark.asyncio
async def test_refresh_token_success(auth_client):
    """リフレッシュトークンで新トークン取得"""
    # まずログインしてリフレッシュトークン取得
    login_resp = await auth_client.post(
        "/api/v1/auth/login",
        json={"email": "admin@test.example.com", "password": "TestPass1!"},
    )
    assert login_resp.status_code == 200
    refresh_token = login_resp.json()["refresh_token"]

    # リフレッシュ
    refresh_resp = await auth_client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": refresh_token},
    )
    assert refresh_resp.status_code == 200
    data = refresh_resp.json()
    assert "access_token" in data
    assert "refresh_token" in data


@pytest.mark.asyncio
async def test_refresh_token_invalid():
    """無効なリフレッシュトークンは401"""
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as c:
        resp = await c.post(
            "/api/v1/auth/refresh",
            json={"refresh_token": "invalid-token"},
        )
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_refresh_with_access_token_fails(auth_client):
    """アクセストークンをリフレッシュに使うと401"""
    # アクセストークン取得
    login_resp = await auth_client.post(
        "/api/v1/auth/login",
        json={"email": "admin@test.example.com", "password": "TestPass1!"},
    )
    access_token = login_resp.json()["access_token"]

    resp = await auth_client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": access_token},
    )
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_me_authenticated(auth_client, admin_headers):
    """/me エンドポイントは認証済みで200を返す"""
    response = await auth_client.get("/api/v1/auth/me", headers=admin_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "admin@test.example.com"
    assert data["role"] == "ADMIN"


@pytest.mark.asyncio
async def test_logout_success(auth_client, admin_headers):
    """ログアウト - 正常"""
    response = await auth_client.post("/api/v1/auth/logout", headers=admin_headers)
    assert response.status_code == 204
