"""ナレッジ・AI支援スキーマ（Pydantic v2）"""
from __future__ import annotations
import uuid
from datetime import datetime
from pydantic import BaseModel, Field
from typing import Optional, List


class KnowledgeArticleCreate(BaseModel):
    title: str = Field(..., max_length=300)
    content: str
    category: str = Field("GENERAL", pattern="^(SAFETY|QUALITY|COST|TECHNICAL|PROCEDURE|GENERAL)$")
    tags: Optional[str] = None
    is_published: bool = False


class KnowledgeArticleUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    category: Optional[str] = None
    tags: Optional[str] = None
    is_published: Optional[bool] = None


class KnowledgeArticleResponse(BaseModel):
    model_config = {"from_attributes": True}
    id: uuid.UUID
    title: str
    content: str
    category: str
    tags: Optional[str] = None
    is_published: bool
    view_count: int
    rating: Optional[float] = None
    created_at: datetime
    updated_at: datetime
    created_by: Optional[uuid.UUID] = None


class AiSearchRequest(BaseModel):
    query: str = Field(..., min_length=1, max_length=500, description="検索クエリ")
    category: Optional[str] = None
    max_results: int = Field(5, ge=1, le=20)


class AiSearchResult(BaseModel):
    article_id: uuid.UUID
    title: str
    excerpt: str
    category: str
    score: float
    tags: Optional[str] = None


class AiSearchResponse(BaseModel):
    query: str
    results: List[AiSearchResult]
    ai_answer: Optional[str] = None
    model_used: Optional[str] = None
    total_results: int
