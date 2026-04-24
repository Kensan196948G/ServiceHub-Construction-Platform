"""Integration test fixtures — Redis を in-memory dict でモック"""

from __future__ import annotations

from unittest.mock import patch

import pytest

_jti_store: dict[str, str] = {}


@pytest.fixture(autouse=True)
def mock_redis_operations():
    """Redis JTI 操作をインメモリ dict でモックする。

    Integration tests はローカル Redis なしで実行できるようにするため、
    store/consume/revoke の 3 関数をパッチする。
    CI は Docker Redis を使うが、ローカルでも全テストが通るようにする。
    """
    _jti_store.clear()

    async def _store(jti: str, ttl_seconds: int) -> None:
        _jti_store[jti] = "1"

    async def _consume(jti: str) -> bool:
        return bool(_jti_store.pop(jti, None))

    async def _revoke(jti: str) -> None:
        _jti_store.pop(jti, None)

    # Patch in both the module where defined AND where imported to avoid
    # "from X import Y" binding issues
    with (
        patch("app.core.redis_client.store_refresh_jti", side_effect=_store),
        patch("app.core.redis_client.consume_refresh_jti", side_effect=_consume),
        patch("app.core.redis_client.revoke_refresh_jti", side_effect=_revoke),
        patch("app.services.auth_service.store_refresh_jti", side_effect=_store),
        patch("app.services.auth_service.consume_refresh_jti", side_effect=_consume),
        patch("app.services.auth_service.revoke_refresh_jti", side_effect=_revoke),
    ):
        yield

    _jti_store.clear()
