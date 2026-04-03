"""ナレッジ管理 統合テスト"""

from __future__ import annotations

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_knowledge_article_lifecycle(
    auth_client: AsyncClient, admin_headers: dict, viewer_headers: dict
):
    """ナレッジ記事 CRUD ライフサイクル"""
    # 1. 作成（非公開）
    resp = await auth_client.post(
        "/api/v1/knowledge/articles",
        json={
            "title": "高所作業安全管理手順書",
            "content": (
                "高所作業時は必ずハーネス型安全帯を着用すること。"
                "作業前点検を徹底し、..."
            ),
            "category": "SAFETY",
            "tags": "安全,高所,ハーネス",
            "is_published": False,
        },
        headers=admin_headers,
    )
    assert resp.status_code == 201, resp.text
    article = resp.json()["data"]
    assert article["title"] == "高所作業安全管理手順書"
    assert article["is_published"] is False
    article_id = article["id"]

    # 2. VIEWER は非公開記事を一覧で見られない
    resp = await auth_client.get(
        "/api/v1/knowledge/articles?published_only=true", headers=viewer_headers
    )
    assert resp.status_code == 200
    ids = [a["id"] for a in resp.json()["data"]]
    assert article_id not in ids

    # 3. 公開
    resp = await auth_client.patch(
        f"/api/v1/knowledge/articles/{article_id}",
        json={"is_published": True},
        headers=admin_headers,
    )
    assert resp.status_code == 200
    assert resp.json()["data"]["is_published"] is True

    # 4. 公開後は閲覧可能
    resp = await auth_client.get(
        f"/api/v1/knowledge/articles/{article_id}", headers=viewer_headers
    )
    assert resp.status_code == 200
    assert resp.json()["data"]["view_count"] >= 1

    # 5. キーワード検索
    resp = await auth_client.get(
        "/api/v1/knowledge/articles?q=ハーネス", headers=viewer_headers
    )
    assert resp.status_code == 200
    assert resp.json()["meta"]["total"] >= 1


@pytest.mark.asyncio
async def test_ai_search_no_openai(
    auth_client: AsyncClient, viewer_headers: dict, admin_headers: dict
):
    """AI検索（OpenAIなし: キーワードマッチのみ）"""
    # 記事作成
    await auth_client.post(
        "/api/v1/knowledge/articles",
        json={
            "title": "品質検査手順",
            "content": (
                "コンクリート強度試験は打設後28日で実施する。" "スランプ試験も必須。"
            ),
            "category": "QUALITY",
            "tags": "品質,コンクリート",
            "is_published": True,
        },
        headers=admin_headers,
    )

    # AI検索（OpenAI未設定のためキーワードマッチのみ）
    resp = await auth_client.post(
        "/api/v1/knowledge/search",
        json={
            "query": "コンクリート",
            "max_results": 5,
        },
        headers=viewer_headers,
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "results" in data
    assert data["query"] == "コンクリート"


@pytest.mark.asyncio
async def test_knowledge_viewer_cannot_create(
    auth_client: AsyncClient, viewer_headers: dict
):
    """VIEWERは記事作成不可"""
    resp = await auth_client.post(
        "/api/v1/knowledge/articles",
        json={
            "title": "テスト",
            "content": "テスト",
        },
        headers=viewer_headers,
    )
    assert resp.status_code == 403
