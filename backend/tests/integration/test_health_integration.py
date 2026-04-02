"""ヘルスチェック統合テスト"""

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_health_check(client: AsyncClient):
    resp = await client.get("/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "healthy"


@pytest.mark.asyncio
async def test_openapi_docs_available(client: AsyncClient):
    """OpenAPI仕様書が利用可能"""
    resp = await client.get("/openapi.json")
    assert resp.status_code == 200
    spec = resp.json()
    assert "paths" in spec
    # 全ルーターが登録されていること
    paths = spec["paths"]
    assert any("/itsm/incidents" in p for p in paths)
    assert any("/knowledge/articles" in p for p in paths)
    assert any("/projects" in p for p in paths)
