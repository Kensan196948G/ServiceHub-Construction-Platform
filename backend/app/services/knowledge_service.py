"""
ナレッジ管理サービス（ビジネスロジック層）
記事CRUD・AI検索・閲覧カウント
"""

from __future__ import annotations

import time
import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.exceptions import NotFoundError
from app.repositories.knowledge import AiSearchLogRepository, KnowledgeArticleRepository
from app.schemas.knowledge import (
    AiSearchResponse,
    AiSearchResult,
    KnowledgeArticleCreate,
    KnowledgeArticleResponse,
    KnowledgeArticleUpdate,
)


class ArticleNotFoundError(NotFoundError):
    detail = "記事が見つかりません"


class KnowledgeService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.article_repo = KnowledgeArticleRepository(db)
        self.log_repo = AiSearchLogRepository(db)

    async def create_article(
        self, data: KnowledgeArticleCreate, created_by: uuid.UUID
    ) -> KnowledgeArticleResponse:
        article = await self.article_repo.create(data, created_by=created_by)
        return KnowledgeArticleResponse.model_validate(article)

    async def list_articles(
        self,
        page: int,
        per_page: int,
        category: str | None = None,
        published_only: bool = True,
        keyword: str | None = None,
    ) -> tuple[list[KnowledgeArticleResponse], int]:
        is_published = True if published_only else None

        if keyword:
            items_raw = await self.article_repo.search(keyword=keyword, limit=per_page)
            total = len(items_raw)
        else:
            offset = (page - 1) * per_page
            total = await self.article_repo.count(
                category=category, is_published=is_published
            )
            items_raw = await self.article_repo.list(
                offset=offset,
                limit=per_page,
                category=category,
                is_published=is_published,
            )

        items = [KnowledgeArticleResponse.model_validate(r) for r in items_raw]
        return items, total

    async def get_article(self, article_id: uuid.UUID) -> KnowledgeArticleResponse:
        article = await self.article_repo.get_by_id(article_id)
        if not article:
            raise ArticleNotFoundError("ナレッジ記事が見つかりません")
        await self.article_repo.increment_view_count(article)
        return KnowledgeArticleResponse.model_validate(article)

    async def update_article(
        self,
        article_id: uuid.UUID,
        data: KnowledgeArticleUpdate,
        updated_by: uuid.UUID,
    ) -> KnowledgeArticleResponse:
        article = await self.article_repo.get_by_id(article_id)
        if not article:
            raise ArticleNotFoundError("ナレッジ記事が見つかりません")
        article = await self.article_repo.update(article, data, updated_by=updated_by)
        return KnowledgeArticleResponse.model_validate(article)

    async def delete_article(
        self, article_id: uuid.UUID, deleted_by: uuid.UUID
    ) -> None:
        article = await self.article_repo.get_by_id(article_id)
        if not article:
            raise ArticleNotFoundError("ナレッジ記事が見つかりません")
        await self.article_repo.soft_delete(article, deleted_by=deleted_by)

    async def ai_search(
        self,
        query: str,
        category: str | None,
        max_results: int,
        user_id: uuid.UUID | None,
    ) -> AiSearchResponse:
        start_time = time.time()

        # Keyword search
        articles = await self.article_repo.search(keyword=query, limit=max_results)

        search_results: list[AiSearchResult] = []
        for article in articles:
            content = article.content
            excerpt = content[:200] + "..." if len(content) > 200 else content
            # Score calculation (title match boost)
            score = 1.0 if query.lower() in article.title.lower() else 0.7
            search_results.append(
                AiSearchResult(
                    article_id=article.id,
                    title=article.title,
                    excerpt=excerpt,
                    category=article.category,
                    score=score,
                    tags=article.tags,
                )
            )

        # AI answer generation (when OpenAI API key is configured)
        ai_answer: str | None = None
        model_used: str | None = None
        tokens_used: int | None = None

        openai_key = settings.OPENAI_API_KEY
        if openai_key and articles:
            try:
                import openai

                context = "\n\n".join(
                    [f"【{a.title}】\n{a.content[:500]}" for a in articles[:3]]
                )
                client = openai.AsyncOpenAI(api_key=openai_key)
                response = await client.chat.completions.create(
                    model="gpt-4o-mini",
                    messages=[
                        {
                            "role": "system",
                            "content": (
                                "建設業のナレッジベースを参照して、"
                                "ユーザーの質問に日本語で回答してください。"
                            ),
                        },
                        {
                            "role": "user",
                            "content": f"参考情報:\n{context}\n\n質問: {query}",
                        },
                    ],
                    max_tokens=500,
                )
                ai_answer = response.choices[0].message.content
                model_used = "gpt-4o-mini"
                tokens_used = response.usage.total_tokens if response.usage else None
            except Exception:
                ai_answer = None  # OpenAI failure fallback

        elapsed_ms = int((time.time() - start_time) * 1000)

        # Save search log (audit)
        await self.log_repo.create(
            user_id=user_id,
            query=query,
            ai_response=ai_answer,
            model_used=model_used,
            tokens_used=tokens_used,
            response_time_ms=elapsed_ms,
        )

        return AiSearchResponse(
            query=query,
            results=search_results,
            ai_answer=ai_answer,
            model_used=model_used,
            total_results=len(search_results),
        )
