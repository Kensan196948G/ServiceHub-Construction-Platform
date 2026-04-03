"""
JWT認証テスト
"""

import pytest
from httpx import ASGITransport, AsyncClient

from app.core.security import create_access_token, get_password_hash, verify_password
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
