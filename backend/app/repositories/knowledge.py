"""
ナレッジ管理リポジトリ（DB操作レイヤー）
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.knowledge import AiSearchLog, KnowledgeArticle
from app.schemas.knowledge import KnowledgeArticleCreate, KnowledgeArticleUpdate


class KnowledgeArticleRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_id(self, article_id: uuid.UUID) -> KnowledgeArticle | None:
        result = await self.db.execute(
            select(KnowledgeArticle).where(
                KnowledgeArticle.id == article_id,
                KnowledgeArticle.deleted_at.is_(None),
            )
        )
        return result.scalar_one_or_none()

    async def list(
        self,
        offset: int = 0,
        limit: int = 20,
        category: str | None = None,
        is_published: bool | None = None,
    ):
        q = select(KnowledgeArticle).where(KnowledgeArticle.deleted_at.is_(None))
        if category:
            q = q.where(KnowledgeArticle.category == category)
        if is_published is not None:
            q = q.where(KnowledgeArticle.is_published == is_published)
        q = q.order_by(KnowledgeArticle.created_at.desc()).offset(offset).limit(limit)
        result = await self.db.execute(q)
        return result.scalars().all()

    async def count(
        self,
        category: str | None = None,
        is_published: bool | None = None,
    ) -> int:
        q = (
            select(func.count())
            .select_from(KnowledgeArticle)
            .where(KnowledgeArticle.deleted_at.is_(None))
        )
        if category:
            q = q.where(KnowledgeArticle.category == category)
        if is_published is not None:
            q = q.where(KnowledgeArticle.is_published == is_published)
        result = await self.db.execute(q)
        return result.scalar_one()

    async def search(self, keyword: str, limit: int = 20):
        """タイトル・本文のキーワード検索"""
        pattern = f"%{keyword}%"
        q = (
            select(KnowledgeArticle)
            .where(
                KnowledgeArticle.deleted_at.is_(None),
                KnowledgeArticle.is_published.is_(True),
            )
            .where(
                KnowledgeArticle.title.ilike(pattern)
                | KnowledgeArticle.content.ilike(pattern)
                | KnowledgeArticle.tags.ilike(pattern)
            )
            .order_by(KnowledgeArticle.view_count.desc())
            .limit(limit)
        )
        result = await self.db.execute(q)
        return result.scalars().all()

    async def create(
        self, data: KnowledgeArticleCreate, created_by: uuid.UUID
    ) -> KnowledgeArticle:
        article = KnowledgeArticle(
            **data.model_dump(),
            created_by=created_by,
            updated_by=created_by,
        )
        self.db.add(article)
        await self.db.flush()
        await self.db.refresh(article)
        return article

    async def update(
        self,
        article: KnowledgeArticle,
        data: KnowledgeArticleUpdate,
        updated_by: uuid.UUID,
    ) -> KnowledgeArticle:
        for field, value in data.model_dump(exclude_none=True).items():
            setattr(article, field, value)
        article.updated_by = updated_by
        await self.db.flush()
        await self.db.refresh(article)
        return article

    async def increment_view_count(self, article: KnowledgeArticle) -> None:
        article.view_count += 1
        await self.db.flush()

    async def soft_delete(
        self, article: KnowledgeArticle, deleted_by: uuid.UUID
    ) -> None:
        article.deleted_at = datetime.now(timezone.utc)
        article.updated_by = deleted_by
        await self.db.flush()


class AiSearchLogRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(
        self,
        user_id: uuid.UUID | None,
        query: str,
        ai_response: str | None = None,
        model_used: str | None = None,
        tokens_used: int | None = None,
        response_time_ms: int | None = None,
    ) -> AiSearchLog:
        log = AiSearchLog(
            user_id=user_id,
            query=query,
            ai_response=ai_response,
            model_used=model_used,
            tokens_used=tokens_used,
            response_time_ms=response_time_ms,
        )
        self.db.add(log)
        await self.db.flush()
        await self.db.refresh(log)
        return log

    async def list_recent(self, limit: int = 50):
        result = await self.db.execute(
            select(AiSearchLog).order_by(AiSearchLog.created_at.desc()).limit(limit)
        )
        return result.scalars().all()
