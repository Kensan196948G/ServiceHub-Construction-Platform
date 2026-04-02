"""
API基盤テスト
共通エラーハンドラ・ページネーション・ルーターのテスト
"""
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.core.pagination import Pagination, get_pagination


def test_pagination_offset():
    """ページネーションオフセット計算テスト"""
    p = Pagination(page=1, per_page=20)
    assert p.offset == 0
    assert p.limit == 20

    p2 = Pagination(page=3, per_page=10)
    assert p2.offset == 20
    assert p2.limit == 10


def test_pagination_meta():
    """ページネーションメタ情報テスト"""
    p = Pagination(page=2, per_page=10)
    meta = p.to_meta(total=55)
    assert meta["total"] == 55
    assert meta["pages"] == 6
    assert meta["page"] == 2


@pytest.mark.asyncio
async def test_404_error_format():
    """404エラーレスポンス形式テスト"""
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        response = await client.get("/api/v1/nonexistent")
    assert response.status_code == 404
    data = response.json()
    assert data["success"] is False
    assert "error" in data
    assert "code" in data["error"]
    assert "message" in data["error"]


@pytest.mark.asyncio
async def test_request_id_header():
    """X-Request-IDヘッダーが付与されることを確認"""
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        response = await client.get("/health")
    assert response.status_code == 200
    assert "x-request-id" in response.headers
