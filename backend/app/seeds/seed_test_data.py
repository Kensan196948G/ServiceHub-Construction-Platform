"""
E2E / fullstack integration test seed script.
Creates a minimal admin user so login-based Playwright tests can authenticate.

Usage (called from docker-compose.test.yml api command):
    python -m app.seeds.seed_test_data
"""

import asyncio
import logging

from app.core.security import get_password_hash
from app.db.base import AsyncSessionLocal
from app.repositories.user import UserRepository
from app.schemas.user import UserCreate

log = logging.getLogger(__name__)

SEED_USERS = [
    UserCreate(
        email="admin@servicehub.example",
        full_name="Test Admin",
        password="Admin1234!",
        role="ADMIN",
    ),
    UserCreate(
        email="viewer@servicehub.example",
        full_name="Test Viewer",
        password="Viewer1234!",
        role="VIEWER",
    ),
]


async def seed() -> None:
    async with AsyncSessionLocal() as session:
        repo = UserRepository(session)
        for user_data in SEED_USERS:
            existing = await repo.get_by_email(user_data.email)
            if existing:
                log.info("user %s already exists — skipping", user_data.email)
                continue
            hashed = get_password_hash(user_data.password)
            await repo.create(user_data, hashed_password=hashed)
            log.info("created seed user: %s (%s)", user_data.email, user_data.role)
        await session.commit()


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    asyncio.run(seed())
