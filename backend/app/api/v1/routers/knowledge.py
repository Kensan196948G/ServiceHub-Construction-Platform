"""
ナレッジ管理・AI支援API
フルテキスト検索 + OpenAI(任意) AI回答生成
"""

from __future__ import annotations

import math
import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.rbac import UserRole, require_roles
from app.db.base import get_db
from app.models.user import User
from app.schemas.common import ApiResponse, PaginatedResponse, PaginationMeta
from app.schemas.knowledge import (
    AiSearchRequest,
    AiSearchResponse,
    KnowledgeArticleCreate,
    KnowledgeArticleResponse,
    KnowledgeArticleUpdate,
)
from app.services.knowledge_service import ArticleNotFoundError, KnowledgeService

router = APIRouter(prefix="/knowledge", tags=["ナレッジ管理"])


# ---------- Knowledge Articles ----------


@router.post(
    "/articles",
    response_model=ApiResponse[KnowledgeArticleResponse],
    status_code=status.HTTP_201_CREATED,
)
async def create_article(
    payload: KnowledgeArticleCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[
        User,
        Depends(
            require_roles(
                UserRole.ADMIN, UserRole.PROJECT_MANAGER, UserRole.IT_OPERATOR
            )
        ),
    ],
):
    """ナレッジ記事作成"""
    svc = KnowledgeService(db)
    article = await svc.create_article(payload, created_by=current_user.id)
    return ApiResponse(data=article, message="ナレッジ記事を作成しました")


@router.get("/articles", response_model=PaginatedResponse[KnowledgeArticleResponse])
async def list_articles(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[
        User,
        Depends(
            require_roles(
                UserRole.ADMIN,
                UserRole.PROJECT_MANAGER,
                UserRole.SITE_SUPERVISOR,
                UserRole.COST_MANAGER,
                UserRole.IT_OPERATOR,
                UserRole.VIEWER,
            )
        ),
    ],
    category: str | None = None,
    published_only: bool = True,
    q: str | None = None,
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
):
    """ナレッジ記事一覧（キーワード検索対応）"""
    svc = KnowledgeService(db)
    items, total = await svc.list_articles(
        page=page,
        per_page=per_page,
        category=category,
        published_only=published_only,
        keyword=q,
    )
    return PaginatedResponse(
        data=items,
        meta=PaginationMeta(
            total=total,
            page=page,
            per_page=per_page,
            pages=math.ceil(total / per_page) if total > 0 else 0,
        ),
    )


@router.get(
    "/articles/{article_id}", response_model=ApiResponse[KnowledgeArticleResponse]
)
async def get_article(
    article_id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[
        User,
        Depends(
            require_roles(
                UserRole.ADMIN,
                UserRole.PROJECT_MANAGER,
                UserRole.SITE_SUPERVISOR,
                UserRole.COST_MANAGER,
                UserRole.IT_OPERATOR,
                UserRole.VIEWER,
            )
        ),
    ],
):
    """ナレッジ記事詳細（閲覧カウント+1）"""
    svc = KnowledgeService(db)
    try:
        article = await svc.get_article(article_id)
    except ArticleNotFoundError:
        raise HTTPException(
            status_code=404, detail="ナレッジ記事が見つかりません"
        ) from None
    return ApiResponse(data=article)


@router.patch(
    "/articles/{article_id}", response_model=ApiResponse[KnowledgeArticleResponse]
)
async def update_article(
    article_id: uuid.UUID,
    payload: KnowledgeArticleUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[
        User,
        Depends(
            require_roles(
                UserRole.ADMIN, UserRole.PROJECT_MANAGER, UserRole.IT_OPERATOR
            )
        ),
    ],
):
    """ナレッジ記事更新"""
    svc = KnowledgeService(db)
    try:
        article = await svc.update_article(
            article_id, payload, updated_by=current_user.id
        )
    except ArticleNotFoundError:
        raise HTTPException(
            status_code=404, detail="ナレッジ記事が見つかりません"
        ) from None
    return ApiResponse(data=article, message="ナレッジ記事を更新しました")


@router.delete("/articles/{article_id}", response_model=ApiResponse[dict])
async def delete_article(
    article_id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_roles(UserRole.ADMIN))],
):
    """ナレッジ記事削除（論理削除）"""
    svc = KnowledgeService(db)
    try:
        await svc.delete_article(article_id, deleted_by=current_user.id)
    except ArticleNotFoundError:
        raise HTTPException(
            status_code=404, detail="ナレッジ記事が見つかりません"
        ) from None
    return ApiResponse(data={}, message="ナレッジ記事を削除しました")


# ---------- AI Search ----------


@router.post("/search", response_model=AiSearchResponse)
async def ai_search(
    payload: AiSearchRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[
        User,
        Depends(
            require_roles(
                UserRole.ADMIN,
                UserRole.PROJECT_MANAGER,
                UserRole.SITE_SUPERVISOR,
                UserRole.COST_MANAGER,
                UserRole.IT_OPERATOR,
                UserRole.VIEWER,
            )
        ),
    ],
):
    """
    ナレッジAI検索
    - キーワードマッチによる関連記事抽出
    - OpenAI APIキー設定時: AI回答生成
    - 検索ログを監査ログとして保存
    """
    svc = KnowledgeService(db)
    return await svc.ai_search(
        query=payload.query,
        category=getattr(payload, "category", None),
        max_results=payload.max_results,
        user_id=current_user.id,
    )
