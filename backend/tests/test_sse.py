"""SSE リアルタイム通知テスト (Phase 4a)"""

import asyncio
import uuid

import pytest

from app.services.sse_manager import SSEConnectionManager  # noqa: E402

# ── Unit tests for SSEConnectionManager ──────────────────────────────────────


def test_connect_creates_queue():
    mgr = SSEConnectionManager()
    uid = uuid.uuid4()
    q = mgr.connect(uid)
    assert q is not None
    assert uid in mgr._queues
    mgr.disconnect(uid, q)
    assert uid not in mgr._queues


def test_disconnect_removes_queue():
    mgr = SSEConnectionManager()
    uid = uuid.uuid4()
    q = mgr.connect(uid)
    mgr.disconnect(uid, q)
    assert uid not in mgr._queues


def test_multiple_connections_same_user():
    mgr = SSEConnectionManager()
    uid = uuid.uuid4()
    q1 = mgr.connect(uid)
    q2 = mgr.connect(uid)
    assert len(mgr._queues[uid]) == 2
    mgr.disconnect(uid, q1)
    assert len(mgr._queues[uid]) == 1
    mgr.disconnect(uid, q2)
    assert uid not in mgr._queues


@pytest.mark.asyncio
async def test_push_delivers_event():
    mgr = SSEConnectionManager()
    uid = uuid.uuid4()
    q = mgr.connect(uid)
    event = {"type": "notification", "id": "abc", "title": "テスト", "message": "msg"}
    await mgr.push(uid, event)
    received = await asyncio.wait_for(q.get(), timeout=1.0)
    assert received == event
    mgr.disconnect(uid, q)


@pytest.mark.asyncio
async def test_push_unknown_user_does_nothing():
    mgr = SSEConnectionManager()
    uid = uuid.uuid4()
    # No exception should be raised
    await mgr.push(uid, {"type": "test"})


@pytest.mark.asyncio
async def test_broadcast_delivers_to_all_users():
    mgr = SSEConnectionManager()
    uid1, uid2 = uuid.uuid4(), uuid.uuid4()
    q1 = mgr.connect(uid1)
    q2 = mgr.connect(uid2)
    event = {"type": "broadcast", "message": "hello"}
    await mgr.broadcast(event)
    r1 = await asyncio.wait_for(q1.get(), timeout=1.0)
    r2 = await asyncio.wait_for(q2.get(), timeout=1.0)
    assert r1 == event
    assert r2 == event
    mgr.disconnect(uid1, q1)
    mgr.disconnect(uid2, q2)


@pytest.mark.asyncio
async def test_event_stream_yields_data():
    mgr = SSEConnectionManager()
    uid = uuid.uuid4()
    q = mgr.connect(uid)
    event = {"type": "notification", "title": "test"}
    await mgr.push(uid, event)
    await q.put(None)  # sentinel to stop stream

    chunks = []
    async for chunk in mgr.event_stream(uid, q):
        chunks.append(chunk)

    full = "".join(chunks)
    assert ": connected" in full
    assert '"type": "notification"' in full


# ── Integration tests for SSE endpoint ───────────────────────────────────────


@pytest.mark.asyncio
async def test_sse_stream_requires_auth(client):
    """認証なしで SSE ストリームを叩くと 401"""
    resp = await client.get("/api/v1/notifications/stream")
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_sse_stream_authenticated_content_type(auth_client, admin_headers):
    """SSE endpoint returns text/event-stream for authenticated user (finite stream mock)"""  # noqa: E501
    from unittest.mock import patch

    async def finite_stream(self, user_id, q):  # noqa: ANN001
        yield ": connected\n\n"
        yield "data: {}\n\n"

    with patch(
        "app.services.sse_manager.SSEConnectionManager.event_stream",
        new=finite_stream,
    ):
        resp = await auth_client.get(
            "/api/v1/notifications/stream",
            headers=admin_headers,
        )
    assert resp.status_code == 200
    assert "text/event-stream" in resp.headers.get("content-type", "")
