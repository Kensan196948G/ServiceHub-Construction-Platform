"""
Redis client — refresh token jti blocklist management.

Stores valid refresh token JTIs so we can invalidate them on use or logout.
Each entry expires automatically when the refresh token would have expired.
"""

import redis.asyncio as aioredis

from app.core.config import settings

_redis: aioredis.Redis | None = None


async def get_redis() -> aioredis.Redis:
    """Return a shared async Redis client, creating it on first call."""
    global _redis
    if _redis is None:
        _redis = aioredis.from_url(
            settings.REDIS_URL,
            encoding="utf-8",
            decode_responses=True,
        )
    return _redis


def _jti_key(jti: str) -> str:
    return f"refresh_jti:{jti}"


async def store_refresh_jti(jti: str, ttl_seconds: int) -> None:
    """Register a newly issued refresh token JTI as valid."""
    r = await get_redis()
    await r.set(_jti_key(jti), "1", ex=ttl_seconds)


async def consume_refresh_jti(jti: str) -> bool:
    """Atomically check-and-delete a refresh token JTI.

    Returns True if the JTI existed (token is valid and now consumed).
    Returns False if the JTI was already used or never existed.
    """
    r = await get_redis()
    deleted = await r.delete(_jti_key(jti))
    return deleted > 0


async def revoke_refresh_jti(jti: str) -> None:
    """Explicitly revoke a refresh token JTI (logout)."""
    r = await get_redis()
    await r.delete(_jti_key(jti))
