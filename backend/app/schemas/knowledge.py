"""ナレッジ・AI支援スキーマ（Pydantic v2）"""

from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, Field


class KnowledgeArticleCreate(BaseModel):
    title: str = Field(..., max_length=300)
    content: str
    category: str = Field(
        "GENERAL", pattern="^(SAFETY|QUALITY|COST|TECHNICAL|PROCEDURE|GENERAL)$"
    )
    tags: str | None = None
    is_published: bool = False


class KnowledgeArticleUpdate(BaseModel):
    title: str | None = None
    content: str | None = None
    category: str | None = None
    tags: str | None = None
    is_published: bool | None = None


class KnowledgeArticleResponse(BaseModel):
    model_config = {"from_attributes": True}
    id: uuid.UUID
    title: str
    content: str
    category: str
    tags: str | None = None
    is_published: bool
    view_count: int
    rating: float | None = None
    created_at: datetime
    updated_at: datetime
    created_by: uuid.UUID | None = None


class AiSearchRequest(BaseModel):
    query: str = Field(..., min_length=1, max_length=500, description="検索クエリ")
    category: str | None = None
    max_results: int = Field(5, ge=1, le=20)


class AiSearchResult(BaseModel):
    article_id: uuid.UUID
    title: str
    excerpt: str
    category: str
    score: float
    tags: str | None = None


class AiSearchResponse(BaseModel):
    query: str
    results: list[AiSearchResult]
    ai_answer: str | None = None
    model_used: str | None = None
    total_results: int
