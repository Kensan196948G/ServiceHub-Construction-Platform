"""SSE (Server-Sent Events) 接続マネージャ (Phase 4a)

各認証ユーザーに asyncio.Queue を割り当て、通知イベントを push する。
ConnectionManager はシングルトンとして app.state に保持される。
"""

import asyncio
import json
import logging
import uuid
from collections.abc import AsyncGenerator
from typing import Any

logger = logging.getLogger(__name__)

# Maximum number of buffered events per user before dropping
_QUEUE_MAX_SIZE = 100


class SSEConnectionManager:
    """ユーザーごとの SSE キューを管理するシングルトン。"""

    def __init__(self) -> None:
        self._queues: dict[uuid.UUID, list[asyncio.Queue[dict[str, Any] | None]]] = {}

    def connect(self, user_id: uuid.UUID) -> asyncio.Queue[dict[str, Any] | None]:
        """新しい SSE 接続キューを登録して返す。"""
        q: asyncio.Queue[dict[str, Any] | None] = asyncio.Queue(maxsize=_QUEUE_MAX_SIZE)
        self._queues.setdefault(user_id, []).append(q)
        n = len(self._queues[user_id])
        logger.debug("SSE connect user=%s total=%d", user_id, n)
        return q

    def disconnect(
        self, user_id: uuid.UUID, q: asyncio.Queue[dict[str, Any] | None]
    ) -> None:
        """SSE 接続キューを登録解除する。"""
        queues = self._queues.get(user_id, [])
        if q in queues:
            queues.remove(q)
        if not queues:
            self._queues.pop(user_id, None)
        logger.debug("SSE disconnect user=%s", user_id)

    async def push(self, user_id: uuid.UUID, event: dict[str, Any]) -> None:
        """Push event to all connections for a user; drop oldest if queue is full."""
        for q in list(self._queues.get(user_id, [])):
            if q.full():
                try:
                    q.get_nowait()  # drop oldest
                except asyncio.QueueEmpty:
                    pass
            await q.put(event)

    async def broadcast(self, event: dict[str, Any]) -> None:
        """全接続ユーザーにイベントを push する。"""
        for user_id in list(self._queues.keys()):
            await self.push(user_id, event)

    async def event_stream(
        self,
        user_id: uuid.UUID,
        q: asyncio.Queue[dict[str, Any] | None],
    ) -> AsyncGenerator[str, None]:
        """SSE テキストストリームを生成する。None を受信したら終了。"""
        # Send initial keep-alive comment
        yield ": connected\n\n"
        try:
            while True:
                try:
                    event = await asyncio.wait_for(q.get(), timeout=30.0)
                except TimeoutError:
                    # Keep-alive ping
                    yield ": ping\n\n"
                    continue
                if event is None:
                    break
                data = json.dumps(event, ensure_ascii=False, default=str)
                yield f"data: {data}\n\n"
        finally:
            self.disconnect(user_id, q)


# Module-level singleton — shared across the entire app process
sse_manager = SSEConnectionManager()
