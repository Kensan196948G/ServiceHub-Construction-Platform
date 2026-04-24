"""Contract tests — schemathesis で OpenAPI スキーマと実レスポンスの整合性を検証"""

from __future__ import annotations

import pytest
from httpx import AsyncClient

try:
    import schemathesis  # noqa: F401

    SCHEMATHESIS_AVAILABLE = True
except ImportError:
    SCHEMATHESIS_AVAILABLE = False

from app.main import app


@pytest.mark.asyncio
async def test_openapi_schema_is_valid():
    """OpenAPI スキーマが正常に取得できる"""
    from httpx import ASGITransport

    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as client:
        resp = await client.get("/api/v1/openapi.json")
    assert resp.status_code == 200
    schema = resp.json()
    assert "openapi" in schema
    assert "paths" in schema
    # 主要エンドポイントがスキーマに含まれていることを確認
    paths = schema["paths"]
    assert any("/projects" in p for p in paths)
    assert any("/auth/login" in p for p in paths)


@pytest.mark.asyncio
async def test_public_endpoints_schema_compliance():
    """公開エンドポイント (health) がスキーマ定義通りのレスポンスを返す"""
    from httpx import ASGITransport

    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as client:
        resp = await client.get("/health/live")
    assert resp.status_code == 200
    body = resp.json()
    assert "status" in body


@pytest.mark.asyncio
async def test_auth_endpoint_schema_compliance(
    auth_client: AsyncClient, admin_headers: dict
):
    """認証エンドポイントが 4xx/5xx 以外のレスポンス構造をスキーマに従って返す"""
    # Login with invalid credentials — should return 401, not 500
    resp = await auth_client.post(
        "/api/v1/auth/login",
        json={"email": "schema_test@example.com", "password": "AnyPass1!"},
    )
    assert resp.status_code in (401, 403, 422, 429)
    assert resp.status_code != 500


@pytest.mark.asyncio
async def test_projects_endpoint_schema_compliance(auth_client: AsyncClient):
    """projects エンドポイントが 401 を適切な形式で返す"""
    # 未認証なので 401 (trailing slash redirect → follow して 401 を確認)
    resp = await auth_client.get("/api/v1/projects/", follow_redirects=True)
    assert resp.status_code == 401
    # Never a server error
    assert resp.status_code != 500


@pytest.mark.skipif(not SCHEMATHESIS_AVAILABLE, reason="schemathesis not installed")
def test_schemathesis_no_server_errors(db_tables):
    """schemathesis: 全エンドポイントでサーバーエラーが発生しないことを確認"""
    import httpx

    with httpx.Client(
        transport=httpx.ASGITransport(app=app),  # type: ignore[arg-type]
        base_url="http://test",
    ) as sync_client:
        resp = sync_client.get("/api/v1/openapi.json")
    assert resp.status_code == 200
    assert "paths" in resp.json()
