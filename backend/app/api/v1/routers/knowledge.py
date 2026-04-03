"""
ナレッジ管理・AI支援API
フルテキスト検索 + OpenAI(任意) AI回答生成
"""

from __future__ import annotations

import math
import time
import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.rbac import UserRole, require_roles
from app.db.base import get_db
from app.models.user import User
from app.repositories.knowledge import AiSearchLogRepository, KnowledgeArticleRepository
from app.schemas.common import ApiResponse, PaginatedResponse, PaginationMeta
from app.schemas.knowledge import (
    AiSearchRequest,
    AiSearchResponse,
    AiSearchResult,
    KnowledgeArticleCreate,
    KnowledgeArticleResponse,
    KnowledgeArticleUpdate,
)

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
    repo = KnowledgeArticleRepository(db)
    article = await repo.create(payload, created_by=current_user.id)
    return ApiResponse(
        data=KnowledgeArticleResponse.model_validate(article),
        message="ナレッジ記事を作成しました",
    )


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
    repo = KnowledgeArticleRepository(db)
    is_published = True if published_only else None

    if q:
        # Keyword search via repository (returns limited results, no offset)
        items_raw = await repo.search(keyword=q, limit=per_page)
        total = len(items_raw)
        items = [KnowledgeArticleResponse.model_validate(r) for r in items_raw]
    else:
        offset = (page - 1) * per_page
        total = await repo.count(category=category, is_published=is_published)
        items_raw = await repo.list(
            offset=offset, limit=per_page, category=category, is_published=is_published
        )
        items = [KnowledgeArticleResponse.model_validate(r) for r in items_raw]

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
    repo = KnowledgeArticleRepository(db)
    article = await repo.get_by_id(article_id)
    if not article:
        raise HTTPException(status_code=404, detail="ナレッジ記事が見つかりません")
    await repo.increment_view_count(article)
    return ApiResponse(data=KnowledgeArticleResponse.model_validate(article))


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
    repo = KnowledgeArticleRepository(db)
    article = await repo.get_by_id(article_id)
    if not article:
        raise HTTPException(status_code=404, detail="ナレッジ記事が見つかりません")
    article = await repo.update(article, payload, updated_by=current_user.id)
    return ApiResponse(
        data=KnowledgeArticleResponse.model_validate(article),
        message="ナレッジ記事を更新しました",
    )


@router.delete("/articles/{article_id}", response_model=ApiResponse[dict])
async def delete_article(
    article_id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_roles(UserRole.ADMIN))],
):
    """ナレッジ記事削除（論理削除）"""
    repo = KnowledgeArticleRepository(db)
    article = await repo.get_by_id(article_id)
    if not article:
        raise HTTPException(status_code=404, detail="ナレッジ記事が見つかりません")
    await repo.soft_delete(article, deleted_by=current_user.id)
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
    import os

    start_time = time.time()

    # キーワード検索
    repo = KnowledgeArticleRepository(db)
    articles = await repo.search(keyword=payload.query, limit=payload.max_results)

    search_results: list[AiSearchResult] = []
    for article in articles:
        content = article.content
        excerpt = content[:200] + "..." if len(content) > 200 else content
        # スコア計算（タイトルマッチ優遇）
        score = 1.0 if payload.query.lower() in article.title.lower() else 0.7
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

    # AI回答生成（OpenAI APIキーが設定されている場合）
    ai_answer: str | None = None
    model_used: str | None = None
    tokens_used: int | None = None

    openai_key = os.getenv("OPENAI_API_KEY")
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
                        "content": f"参考情報:\n{context}\n\n質問: {payload.query}",
                    },
                ],
                max_tokens=500,
            )
            ai_answer = response.choices[0].message.content
            model_used = "gpt-4o-mini"
            tokens_used = response.usage.total_tokens if response.usage else None
        except Exception:
            ai_answer = None  # OpenAI失敗時はフォールバック

    elapsed_ms = int((time.time() - start_time) * 1000)

    # 検索ログ保存（監査用）
    log_repo = AiSearchLogRepository(db)
    await log_repo.create(
        user_id=current_user.id,
        query=payload.query,
        ai_response=ai_answer,
        model_used=model_used,
        tokens_used=tokens_used,
        response_time_ms=elapsed_ms,
    )

    return AiSearchResponse(
        query=payload.query,
        results=search_results,
        ai_answer=ai_answer,
        model_used=model_used,
        total_results=len(search_results),
    )
