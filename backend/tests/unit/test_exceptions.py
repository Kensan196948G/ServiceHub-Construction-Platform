"""Exception handlers unit tests

Covers: register_exception_handlers in app/core/exceptions.py
- RequestValidationError -> 422 VALIDATION_ERROR
- unhandled Exception -> 500 INTERNAL_ERROR
- HTTPException -> HTTP_{status_code}
"""

import pytest


@pytest.mark.asyncio
async def test_validation_error_returns_422(client):
    """RequestValidationError -> 422 with VALIDATION_ERROR code"""
    # POST /api/v1/auth/login expects {email, password} strings.
    # Sending wrong types triggers RequestValidationError.
    response = await client.post(
        "/api/v1/auth/login",
        json={"email": 12345, "password": []},
    )
    assert response.status_code == 422
    body = response.json()
    assert body["success"] is False
    assert body["error"]["code"] == "VALIDATION_ERROR"
    assert "field" in body["error"]
    assert "message" in body["error"]


@pytest.mark.asyncio
async def test_http_exception_returns_correct_status(client):
    """HTTPException (404) -> proper status code and HTTP_{code} error code"""
    response = await client.get("/api/v1/nonexistent-route-that-does-not-exist")
    assert response.status_code == 404
    body = response.json()
    assert body["success"] is False
    assert body["error"]["code"] == "HTTP_404"
    assert "message" in body["error"]


@pytest.mark.asyncio
async def test_unhandled_exception_returns_500(db_session):
    """Unhandled Exception -> 500 with INTERNAL_ERROR code"""
    from fastapi import APIRouter
    from httpx import ASGITransport, AsyncClient

    from app.db.base import get_db
    from app.main import app

    # Add a temporary route that raises a raw Exception
    router = APIRouter()

    @router.get("/_test/raise-unhandled")
    async def raise_unhandled():
        raise RuntimeError("Deliberate test explosion")

    app.include_router(router)

    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db

    try:
        # raise_app_exceptions=False prevents httpx from re-raising
        # the exception, letting the app's exception handler respond.
        transport = ASGITransport(app=app, raise_app_exceptions=False)
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            response = await ac.get("/_test/raise-unhandled")
        assert response.status_code == 500
        body = response.json()
        assert body["success"] is False
        assert body["error"]["code"] == "INTERNAL_ERROR"
        assert body["error"]["message"] == "サーバー内部エラーが発生しました"
    finally:
        app.dependency_overrides.clear()
        # Clean up: remove the temporary route
        app.routes[:] = [
            r for r in app.routes if not getattr(r, "path", "").startswith("/_test/")
        ]
