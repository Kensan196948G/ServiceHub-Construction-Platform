"""ナレッジ管理APIテスト"""

import pytest
from httpx import AsyncClient

from app.main import app


@pytest.mark.asyncio
async def test_list_articles_requires_auth():
    """未認証でナレッジ一覧は401"""
    async with AsyncClient(app=app, base_url="http://test") as client:
        resp = await client.get("/api/v1/knowledge/articles")
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_ai_search_requires_auth():
    """未認証でAI検索は401"""
    async with AsyncClient(app=app, base_url="http://test") as client:
        resp = await client.post("/api/v1/knowledge/search", json={"query": "安全管理"})
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_create_article_requires_auth():
    """未認証でナレッジ記事作成は401"""
    async with AsyncClient(app=app, base_url="http://test") as client:
        resp = await client.post(
            "/api/v1/knowledge/articles",
            json={
                "title": "テスト記事",
                "content": "テスト内容",
            },
        )
    assert resp.status_code == 401
