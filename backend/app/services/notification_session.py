"""通知配信用の独立 AsyncSession ヘルパ (Phase 2b)

Phase 2a では NotificationDispatcher が呼び出し側の session で自ら commit
を呼び出す暫定実装を取っていた。Phase 2b では配信責務を独立 session に
分離し、以下を達成する:

- 呼び出し側 request-scoped session の transaction 境界を侵食しない
- 通知配信の transaction 境界は `notification_session()` コンテキストが持つ
- BackgroundTasks / Phase 2c のドメインフック統合の土台

呼び出し側は `async with notification_session() as s:` の形で使用する。
コンテキスト抜け時に commit、例外時に rollback する。
"""

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from sqlalchemy.ext.asyncio import AsyncSession

from app.db.base import AsyncSessionLocal


@asynccontextmanager
async def notification_session() -> AsyncIterator[AsyncSession]:
    """通知配信専用の独立 AsyncSession コンテキスト。

    `AsyncSessionLocal` (request dep と同じ engine/sessionmaker) から新しい
    session を取得するため、別 transaction として動作する。テスト時は
    conftest の engine override に依存するため、Phase 2a と同じ
    `AsyncSessionLocal` を参照する点に注意。
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
