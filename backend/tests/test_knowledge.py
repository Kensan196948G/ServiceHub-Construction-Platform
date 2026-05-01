"""ナレッジ管理APIテスト"""

import uuid

import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app


@pytest.mark.asyncio
async def test_list_articles_requires_auth():
    """未認証でナレッジ一覧は401"""
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        resp = await client.get("/api/v1/knowledge/articles")
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_ai_search_requires_auth():
    """未認証でAI検索は401"""
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        resp = await client.post("/api/v1/knowledge/search", json={"query": "安全管理"})
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_create_article_requires_auth():
    """未認証でナレッジ記事作成は401"""
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        resp = await client.post(
            "/api/v1/knowledge/articles",
            json={
                "title": "テスト記事",
                "content": "テスト内容",
            },
        )
    assert resp.status_code == 401


# ---------------------------------------------------------------------------
# CRUD - 正常系
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_create_article(auth_client, admin_headers):
    """ナレッジ記事作成 - 正常"""
    resp = await auth_client.post(
        "/api/v1/knowledge/articles",
        json={
            "title": "安全管理ガイドライン",
            "content": "現場での安全管理に関する詳細なガイドライン。",
            "category": "SAFETY",
            "tags": "安全,ガイドライン",
            "is_published": True,
        },
        headers=admin_headers,
    )
    assert resp.status_code == 201
    data = resp.json()["data"]
    assert data["title"] == "安全管理ガイドライン"
    assert data["category"] == "SAFETY"
    assert data["is_published"] is True


@pytest.mark.asyncio
async def test_list_articles_authenticated(auth_client, admin_headers):
    """ナレッジ記事一覧 - 認証済み"""
    # 公開記事を作成
    await auth_client.post(
        "/api/v1/knowledge/articles",
        json={
            "title": "品質管理手順書",
            "content": "品質管理の基本手順",
            "category": "QUALITY",
            "is_published": True,
        },
        headers=admin_headers,
    )

    resp = await auth_client.get(
        "/api/v1/knowledge/articles",
        headers=admin_headers,
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["meta"]["total"] >= 1


@pytest.mark.asyncio
async def test_list_articles_with_keyword(auth_client, admin_headers):
    """ナレッジ記事一覧 - キーワード検索"""
    await auth_client.post(
        "/api/v1/knowledge/articles",
        json={
            "title": "コンクリート打設手順",
            "content": "コンクリートの打設に関する詳細手順。",
            "category": "TECHNICAL",
            "is_published": True,
        },
        headers=admin_headers,
    )

    resp = await auth_client.get(
        "/api/v1/knowledge/articles?q=コンクリート",
        headers=admin_headers,
    )
    assert resp.status_code == 200
    assert resp.json()["meta"]["total"] >= 1


@pytest.mark.asyncio
async def test_list_articles_with_category(auth_client, admin_headers):
    """ナレッジ記事一覧 - カテゴリフィルタ"""
    await auth_client.post(
        "/api/v1/knowledge/articles",
        json={
            "title": "原価管理ガイド",
            "content": "原価管理の基本",
            "category": "COST",
            "is_published": True,
        },
        headers=admin_headers,
    )

    resp = await auth_client.get(
        "/api/v1/knowledge/articles?category=COST",
        headers=admin_headers,
    )
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_list_articles_unpublished(auth_client, admin_headers):
    """ナレッジ記事一覧 - 未公開を含む"""
    await auth_client.post(
        "/api/v1/knowledge/articles",
        json={
            "title": "下書き記事",
            "content": "未公開コンテンツ",
            "category": "GENERAL",
            "is_published": False,
        },
        headers=admin_headers,
    )

    resp = await auth_client.get(
        "/api/v1/knowledge/articles?published_only=false",
        headers=admin_headers,
    )
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_get_article_not_found(auth_client, admin_headers):
    """存在しないナレッジ記事は404"""
    fake_id = str(uuid.uuid4())
    resp = await auth_client.get(
        f"/api/v1/knowledge/articles/{fake_id}",
        headers=admin_headers,
    )
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_get_article_success(auth_client, admin_headers):
    """ナレッジ記事詳細取得 - 正常（閲覧数+1）"""
    create_resp = await auth_client.post(
        "/api/v1/knowledge/articles",
        json={
            "title": "鉄筋工事手順",
            "content": "鉄筋工事の詳細手順書。",
            "category": "TECHNICAL",
            "is_published": True,
        },
        headers=admin_headers,
    )
    assert create_resp.status_code == 201
    article_id = create_resp.json()["data"]["id"]

    get_resp = await auth_client.get(
        f"/api/v1/knowledge/articles/{article_id}",
        headers=admin_headers,
    )
    assert get_resp.status_code == 200
    data = get_resp.json()["data"]
    assert data["id"] == article_id
    assert data["view_count"] == 1


@pytest.mark.asyncio
async def test_update_article_not_found(auth_client, admin_headers):
    """存在しないナレッジ記事の更新は404"""
    fake_id = str(uuid.uuid4())
    resp = await auth_client.patch(
        f"/api/v1/knowledge/articles/{fake_id}",
        json={"title": "更新タイトル"},
        headers=admin_headers,
    )
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_update_article_success(auth_client, admin_headers):
    """ナレッジ記事更新 - 正常"""
    create_resp = await auth_client.post(
        "/api/v1/knowledge/articles",
        json={
            "title": "施工手順書v1",
            "content": "初版内容",
            "category": "PROCEDURE",
            "is_published": False,
        },
        headers=admin_headers,
    )
    article_id = create_resp.json()["data"]["id"]

    update_resp = await auth_client.patch(
        f"/api/v1/knowledge/articles/{article_id}",
        json={"title": "施工手順書v2", "is_published": True},
        headers=admin_headers,
    )
    assert update_resp.status_code == 200
    updated = update_resp.json()["data"]
    assert updated["title"] == "施工手順書v2"
    assert updated["is_published"] is True


@pytest.mark.asyncio
async def test_delete_article_not_found(auth_client, admin_headers):
    """存在しないナレッジ記事の削除は404"""
    fake_id = str(uuid.uuid4())
    resp = await auth_client.delete(
        f"/api/v1/knowledge/articles/{fake_id}",
        headers=admin_headers,
    )
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_delete_article_success(auth_client, admin_headers):
    """ナレッジ記事削除 - 正常"""
    create_resp = await auth_client.post(
        "/api/v1/knowledge/articles",
        json={
            "title": "削除対象記事",
            "content": "削除するコンテンツ",
            "category": "GENERAL",
            "is_published": True,
        },
        headers=admin_headers,
    )
    article_id = create_resp.json()["data"]["id"]

    del_resp = await auth_client.delete(
        f"/api/v1/knowledge/articles/{article_id}",
        headers=admin_headers,
    )
    assert del_resp.status_code == 200

    # 削除後は404
    get_resp = await auth_client.get(
        f"/api/v1/knowledge/articles/{article_id}",
        headers=admin_headers,
    )
    assert get_resp.status_code == 404


@pytest.mark.asyncio
async def test_ai_search_no_results(auth_client, admin_headers):
    """AI検索 - ヒットなし"""
    resp = await auth_client.post(
        "/api/v1/knowledge/search",
        json={"query": "存在しないキーワードxyz12345"},
        headers=admin_headers,
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["total_results"] == 0
    assert body["query"] == "存在しないキーワードxyz12345"


@pytest.mark.asyncio
async def test_ai_search_with_results(auth_client, admin_headers):
    """AI検索 - ヒットあり"""
    # 公開記事作成
    await auth_client.post(
        "/api/v1/knowledge/articles",
        json={
            "title": "足場安全基準",
            "content": "足場の設置と安全基準について",
            "category": "SAFETY",
            "is_published": True,
        },
        headers=admin_headers,
    )

    resp = await auth_client.post(
        "/api/v1/knowledge/search",
        json={"query": "足場", "max_results": 5},
        headers=admin_headers,
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["total_results"] >= 1
    assert body["results"][0]["title"] == "足場安全基準"


@pytest.mark.asyncio
async def test_ai_search_with_category_filter(auth_client, admin_headers):
    """AI検索 - カテゴリフィルタ"""
    await auth_client.post(
        "/api/v1/knowledge/articles",
        json={
            "title": "掘削安全手順",
            "content": "掘削作業の安全管理手順",
            "category": "SAFETY",
            "is_published": True,
        },
        headers=admin_headers,
    )

    resp = await auth_client.post(
        "/api/v1/knowledge/search",
        json={"query": "掘削", "category": "SAFETY"},
        headers=admin_headers,
    )
    assert resp.status_code == 200
    assert resp.json()["total_results"] >= 1
