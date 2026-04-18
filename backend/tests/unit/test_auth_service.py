"""AuthService ユニットテスト (Phase 5c)

外部依存 (UserRepository / Redis / JWT) を patch して、
ログイン・リフレッシュ・ログアウトの分岐を網羅する。
"""

import uuid
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.core.exceptions import ForbiddenError
from app.schemas.auth import LoginRequest
from app.services.auth_service import (
    AuthenticationError,
    AuthorizationError,
    AuthService,
)


# ── Fixtures ─────────────────────────────────────────────────────────────────


def _build_user(*, is_active: bool = True) -> SimpleNamespace:
    """User モデルの最小スタブ (属性参照のみ使う)。"""
    return SimpleNamespace(
        id=uuid.uuid4(),
        email="user@example.com",
        hashed_password="$2b$12$fakehash",
        role="VIEWER",
        is_active=is_active,
    )


def _build_service() -> AuthService:
    """AsyncSession は MagicMock で充分。user_repo は後段で書き換える。"""
    svc = AuthService(db=MagicMock())
    svc.user_repo = MagicMock()
    svc.user_repo.get_by_email = AsyncMock()
    svc.user_repo.get_by_id = AsyncMock()
    svc.user_repo.update_last_login = AsyncMock()
    return svc


def _login_payload() -> LoginRequest:
    return LoginRequest(email="user@example.com", password="pw12345678")


# ── login() ──────────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_login_success_issues_tokens():
    svc = _build_service()
    user = _build_user()
    svc.user_repo.get_by_email.return_value = user

    with (
        patch(
            "app.services.auth_service.verify_password", return_value=True
        ) as vp,
        patch(
            "app.services.auth_service.create_access_token",
            return_value="access.jwt",
        ),
        patch(
            "app.services.auth_service.create_refresh_token",
            return_value="refresh.jwt",
        ),
        patch(
            "app.services.auth_service.verify_token",
            return_value=SimpleNamespace(jti="jti-1", type="refresh", sub=str(user.id)),
        ),
        patch(
            "app.services.auth_service.store_refresh_jti",
            new=AsyncMock(),
        ) as store,
    ):
        tokens = await svc.login(_login_payload())

    vp.assert_called_once()
    svc.user_repo.update_last_login.assert_awaited_once_with(user)
    store.assert_awaited_once()
    assert tokens.access_token == "access.jwt"
    assert tokens.refresh_token == "refresh.jwt"
    assert tokens.token_type == "bearer"
    assert tokens.expires_in > 0


@pytest.mark.asyncio
async def test_login_user_not_found_raises_authentication():
    svc = _build_service()
    svc.user_repo.get_by_email.return_value = None

    with pytest.raises(AuthenticationError):
        await svc.login(_login_payload())

    svc.user_repo.update_last_login.assert_not_called()


@pytest.mark.asyncio
async def test_login_password_mismatch_raises_authentication():
    svc = _build_service()
    svc.user_repo.get_by_email.return_value = _build_user()

    with patch(
        "app.services.auth_service.verify_password", return_value=False
    ):
        with pytest.raises(AuthenticationError):
            await svc.login(_login_payload())


@pytest.mark.asyncio
async def test_login_inactive_user_raises_authorization():
    svc = _build_service()
    svc.user_repo.get_by_email.return_value = _build_user(is_active=False)

    with patch(
        "app.services.auth_service.verify_password", return_value=True
    ):
        with pytest.raises(AuthorizationError) as exc:
            await svc.login(_login_payload())

    # AuthorizationError は ForbiddenError を継承 (403 相当)
    assert isinstance(exc.value, ForbiddenError)


# ── refresh() ────────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_refresh_invalid_token_raises():
    svc = _build_service()
    with patch("app.services.auth_service.verify_token", return_value=None):
        with pytest.raises(AuthenticationError):
            await svc.refresh("garbage")


@pytest.mark.asyncio
async def test_refresh_wrong_token_type_raises():
    """access トークンを refresh として渡すと拒否される。"""
    svc = _build_service()
    with patch(
        "app.services.auth_service.verify_token",
        return_value=SimpleNamespace(jti="j", type="access", sub="x"),
    ):
        with pytest.raises(AuthenticationError):
            await svc.refresh("access.jwt")


@pytest.mark.asyncio
async def test_refresh_jti_reuse_detected_raises():
    """consume_refresh_jti が False を返す = 既に使用済み or 失効。"""
    svc = _build_service()
    user = _build_user()
    td = SimpleNamespace(jti="j1", type="refresh", sub=str(user.id))
    with (
        patch("app.services.auth_service.verify_token", return_value=td),
        patch(
            "app.services.auth_service.consume_refresh_jti",
            new=AsyncMock(return_value=False),
        ),
    ):
        with pytest.raises(AuthenticationError):
            await svc.refresh("refresh.jwt")

    svc.user_repo.get_by_id.assert_not_called()


@pytest.mark.asyncio
async def test_refresh_user_missing_raises():
    svc = _build_service()
    svc.user_repo.get_by_id.return_value = None
    td = SimpleNamespace(jti="j1", type="refresh", sub=str(uuid.uuid4()))

    with (
        patch("app.services.auth_service.verify_token", return_value=td),
        patch(
            "app.services.auth_service.consume_refresh_jti",
            new=AsyncMock(return_value=True),
        ),
    ):
        with pytest.raises(AuthenticationError):
            await svc.refresh("refresh.jwt")


@pytest.mark.asyncio
async def test_refresh_inactive_user_raises():
    svc = _build_service()
    user = _build_user(is_active=False)
    svc.user_repo.get_by_id.return_value = user
    td = SimpleNamespace(jti="j1", type="refresh", sub=str(user.id))

    with (
        patch("app.services.auth_service.verify_token", return_value=td),
        patch(
            "app.services.auth_service.consume_refresh_jti",
            new=AsyncMock(return_value=True),
        ),
    ):
        with pytest.raises(AuthenticationError):
            await svc.refresh("refresh.jwt")


@pytest.mark.asyncio
async def test_refresh_success_rotates_tokens():
    svc = _build_service()
    user = _build_user()
    svc.user_repo.get_by_id.return_value = user
    # verify_token は refresh 判定用 (td_in) → 新トークン検証用 (td_new) の 2 回呼ばれる
    td_in = SimpleNamespace(jti="old", type="refresh", sub=str(user.id))
    td_new = SimpleNamespace(jti="new", type="refresh", sub=str(user.id))

    with (
        patch(
            "app.services.auth_service.verify_token",
            side_effect=[td_in, td_new],
        ),
        patch(
            "app.services.auth_service.consume_refresh_jti",
            new=AsyncMock(return_value=True),
        ),
        patch(
            "app.services.auth_service.create_access_token",
            return_value="new.access",
        ),
        patch(
            "app.services.auth_service.create_refresh_token",
            return_value="new.refresh",
        ),
        patch(
            "app.services.auth_service.store_refresh_jti",
            new=AsyncMock(),
        ) as store,
    ):
        tokens = await svc.refresh("old.refresh")

    assert tokens.access_token == "new.access"
    assert tokens.refresh_token == "new.refresh"
    store.assert_awaited_once()


# ── logout() ─────────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_logout_none_token_is_noop():
    svc = _build_service()
    # None でも例外なく早期 return
    await svc.logout(None)


@pytest.mark.asyncio
async def test_logout_invalid_token_is_noop():
    """verify_token が None を返した場合は静かに何もしない。"""
    svc = _build_service()
    with (
        patch("app.services.auth_service.verify_token", return_value=None),
        patch(
            "app.services.auth_service.revoke_refresh_jti",
            new=AsyncMock(),
        ) as revoke,
    ):
        await svc.logout("garbage")
    revoke.assert_not_called()


@pytest.mark.asyncio
async def test_logout_non_refresh_token_is_noop():
    """access トークンが誤って渡された場合も revoke されない。"""
    svc = _build_service()
    td = SimpleNamespace(jti="j", type="access", sub="x")
    with (
        patch("app.services.auth_service.verify_token", return_value=td),
        patch(
            "app.services.auth_service.revoke_refresh_jti",
            new=AsyncMock(),
        ) as revoke,
    ):
        await svc.logout("access.jwt")
    revoke.assert_not_called()


@pytest.mark.asyncio
async def test_logout_valid_refresh_revokes_jti():
    svc = _build_service()
    td = SimpleNamespace(jti="jti-xyz", type="refresh", sub="x")
    with (
        patch("app.services.auth_service.verify_token", return_value=td),
        patch(
            "app.services.auth_service.revoke_refresh_jti",
            new=AsyncMock(),
        ) as revoke,
    ):
        await svc.logout("refresh.jwt")
    revoke.assert_awaited_once_with("jti-xyz")
