"""UserService のユニットテスト"""

import uuid

import pytest


@pytest.mark.asyncio
async def test_user_crud(auth_client, admin_headers):
    """ユーザーのCRUD"""
    email = f"test-{uuid.uuid4().hex[:6]}@example.com"

    # Create
    resp = await auth_client.post(
        "/api/v1/users",
        json={
            "email": email,
            "full_name": "テストユーザー",
            "password": "SecurePass123!",
            "role": "VIEWER",
        },
        headers=admin_headers,
    )
    assert resp.status_code == 201
    user = resp.json()["data"]
    user_id = user["id"]
    assert user["email"] == email

    # Get
    resp = await auth_client.get(f"/api/v1/users/{user_id}", headers=admin_headers)
    assert resp.status_code == 200

    # Update
    resp = await auth_client.put(
        f"/api/v1/users/{user_id}",
        json={"full_name": "更新ユーザー", "role": "PROJECT_MANAGER"},
        headers=admin_headers,
    )
    assert resp.status_code == 200
    assert resp.json()["data"]["full_name"] == "更新ユーザー"

    # List
    resp = await auth_client.get("/api/v1/users", headers=admin_headers)
    assert resp.status_code == 200
    assert resp.json()["meta"]["total"] >= 1


@pytest.mark.asyncio
async def test_user_duplicate_email(auth_client, admin_headers):
    """重複メールアドレスは400"""
    email = f"dup-{uuid.uuid4().hex[:6]}@example.com"
    payload = {
        "email": email,
        "full_name": "First",
        "password": "SecurePass123!",
        "role": "VIEWER",
    }
    resp1 = await auth_client.post("/api/v1/users", json=payload, headers=admin_headers)
    assert resp1.status_code == 201

    resp2 = await auth_client.post("/api/v1/users", json=payload, headers=admin_headers)
    assert resp2.status_code == 400


@pytest.mark.asyncio
async def test_user_not_found(auth_client, admin_headers):
    """存在しないユーザーは404"""
    resp = await auth_client.get(f"/api/v1/users/{uuid.uuid4()}", headers=admin_headers)
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_user_self_delete_blocked(auth_client, admin_headers):
    """自分自身の削除は400"""
    from tests.conftest import ADMIN_USER_ID

    resp = await auth_client.delete(
        f"/api/v1/users/{ADMIN_USER_ID}", headers=admin_headers
    )
    assert resp.status_code == 400
