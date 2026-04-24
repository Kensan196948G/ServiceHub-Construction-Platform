"""認証フロー 統合テスト — login / me / logout を DB経由で検証"""

from __future__ import annotations

import pytest
from httpx import AsyncClient

from app.core.rbac import UserRole
from tests.conftest import (
    ADMIN_USER_ID,
    VIEWER_USER_ID,
    make_token,
)


@pytest.mark.asyncio
async def test_login_success_returns_tokens(auth_client: AsyncClient):
    """正しい認証情報でアクセストークン + リフレッシュトークンが返る"""
    resp = await auth_client.post(
        "/api/v1/auth/login",
        json={"email": "admin@test.example.com", "password": "TestPass1!"},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert "access_token" in body
    assert "refresh_token" in body
    assert body["token_type"] == "bearer"


@pytest.mark.asyncio
async def test_login_wrong_password_returns_401(auth_client: AsyncClient):
    """パスワード誤りで 401 を返す"""
    resp = await auth_client.post(
        "/api/v1/auth/login",
        json={"email": "admin@test.example.com", "password": "WrongPass!"},
    )
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_login_unknown_email_returns_401(auth_client: AsyncClient):
    """存在しないメールで 401 を返す"""
    resp = await auth_client.post(
        "/api/v1/auth/login",
        json={"email": "nobody@example.com", "password": "AnyPass1!"},
    )
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_get_me_returns_current_user(auth_client: AsyncClient):
    """有効な JWT で /me が自分のユーザー情報を返す"""
    token = make_token(UserRole.ADMIN, ADMIN_USER_ID)
    headers = {"Authorization": f"Bearer {token}"}
    resp = await auth_client.get("/api/v1/auth/me", headers=headers)
    assert resp.status_code == 200
    body = resp.json()
    assert body["email"] == "admin@test.example.com"
    assert body["role"] == "ADMIN"


@pytest.mark.asyncio
async def test_get_me_viewer_role(auth_client: AsyncClient):
    """VIEWER ロールのユーザーも /me で自分の情報を取得できる"""
    token = make_token(UserRole.VIEWER, VIEWER_USER_ID)
    headers = {"Authorization": f"Bearer {token}"}
    resp = await auth_client.get("/api/v1/auth/me", headers=headers)
    assert resp.status_code == 200
    assert resp.json()["role"] == "VIEWER"


@pytest.mark.asyncio
async def test_get_me_unauthorized(auth_client: AsyncClient):
    """JWT なしで /me は 401"""
    resp = await auth_client.get("/api/v1/auth/me")
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_full_auth_flow(auth_client: AsyncClient):
    """ログイン → アクセストークンで /me → リフレッシュ → 新トークンで /me"""
    # 1. Login
    login_resp = await auth_client.post(
        "/api/v1/auth/login",
        json={"email": "pm@test.example.com", "password": "TestPass1!"},
    )
    assert login_resp.status_code == 200
    tokens = login_resp.json()
    access_token = tokens["access_token"]
    refresh_token = tokens["refresh_token"]

    # 2. /me with access token
    me_resp = await auth_client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {access_token}"},
    )
    assert me_resp.status_code == 200
    assert me_resp.json()["role"] == "PROJECT_MANAGER"

    # 3. Refresh
    refresh_resp = await auth_client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": refresh_token},
    )
    assert refresh_resp.status_code == 200
    new_access_token = refresh_resp.json()["access_token"]
    assert new_access_token != access_token

    # 4. /me with new access token
    me2_resp = await auth_client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {new_access_token}"},
    )
    assert me2_resp.status_code == 200
    assert me2_resp.json()["role"] == "PROJECT_MANAGER"
