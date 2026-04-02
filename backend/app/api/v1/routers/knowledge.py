"""
ナレッジ管理・AI支援API
フルテキスト検索 + OpenAI(任意) AI回答生成
"""
from __future__ import annotations
import uuid
import time
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, and_, func, or_

from app.db.base import get_db
from app.core.rbac import require_roles, UserRole
from app.models.knowledge import KnowledgeArticle, AiSearchLog
from app.schemas.knowledge import (
    KnowledgeArticleCreate, KnowledgeArticleUpdate, KnowledgeArticleResponse,
    AiSearchRequest, AiSearchResponse, AiSearchResult,
)
from app.schemas.common import ApiResponse, PaginatedResponse

router = APIRouter(prefix="/knowledge", tags=["ナレッジ管理"])


# ---------- Knowledge Articles ----------

@router.post("/articles", response_model=ApiResponse[KnowledgeArticleResponse], status_code=status.HTTP_201_CREATED)
async def create_article(
    payload: KnowledgeArticleCreate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_roles([UserRole.ADMIN, UserRole.PROJECT_MANAGER, UserRole.IT_OPERATOR])),
):
    """ナレッジ記事作成"""
    article = KnowledgeArticle(
        title=payload.title,
        content=payload.content,
        category=payload.category,
        tags=payload.tags,
        is_published=payload.is_published,
        created_by=current_user.id,
        updated_by=current_user.id,
    )
    db.add(article)
    await db.commit()
    await db.refresh(article)
    return ApiResponse(data=KnowledgeArticleResponse.model_validate(article), message="ナレッジ記事を作成しました")


@router.get("/articles", response_model=PaginatedResponse[KnowledgeArticleResponse])
async def list_articles(
    category: Optional[str] = None,
    published_only: bool = True,
    q: Optional[str] = None,
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_roles([UserRole.ADMIN, UserRole.PROJECT_MANAGER, UserRole.SITE_SUPERVISOR,
                                        UserRole.COST_MANAGER, UserRole.IT_OPERATOR, UserRole.VIEWER])),
):
    """ナレッジ記事一覧（キーワード検索対応）"""
    conditions = [KnowledgeArticle.deleted_at.is_(None)]
    if published_only:
        conditions.append(KnowledgeArticle.is_published.is_(True))
    if category:
        conditions.append(KnowledgeArticle.category == category)
    if q:
        keyword = f"%{q}%"
        conditions.append(or_(
            KnowledgeArticle.title.ilike(keyword),
            KnowledgeArticle.content.ilike(keyword),
            KnowledgeArticle.tags.ilike(keyword),
        ))

    total_result = await db.execute(
        select(func.count()).select_from(KnowledgeArticle).where(and_(*conditions))
    )
    total = total_result.scalar_one()

    result = await db.execute(
        select(KnowledgeArticle).where(and_(*conditions))
        .order_by(KnowledgeArticle.view_count.desc())
        .offset((page - 1) * per_page).limit(per_page)
    )
    items = [KnowledgeArticleResponse.model_validate(r) for r in result.scalars()]
    return PaginatedResponse(items=items, total=total, page=page, per_page=per_page)


@router.get("/articles/{article_id}", response_model=ApiResponse[KnowledgeArticleResponse])
async def get_article(
    article_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_roles([UserRole.ADMIN, UserRole.PROJECT_MANAGER, UserRole.SITE_SUPERVISOR,
                                        UserRole.COST_MANAGER, UserRole.IT_OPERATOR, UserRole.VIEWER])),
):
    """ナレッジ記事詳細（閲覧カウント+1）"""
    result = await db.execute(
        select(KnowledgeArticle).where(
            and_(KnowledgeArticle.id == article_id, KnowledgeArticle.deleted_at.is_(None))
        )
    )
    article = result.scalar_one_or_none()
    if not article:
        raise HTTPException(status_code=404, detail="ナレッジ記事が見つかりません")
    article.view_count += 1
    await db.commit()
    await db.refresh(article)
    return ApiResponse(data=KnowledgeArticleResponse.model_validate(article))


@router.patch("/articles/{article_id}", response_model=ApiResponse[KnowledgeArticleResponse])
async def update_article(
    article_id: uuid.UUID,
    payload: KnowledgeArticleUpdate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_roles([UserRole.ADMIN, UserRole.PROJECT_MANAGER, UserRole.IT_OPERATOR])),
):
    result = await db.execute(
        select(KnowledgeArticle).where(
            and_(KnowledgeArticle.id == article_id, KnowledgeArticle.deleted_at.is_(None))
        )
    )
    article = result.scalar_one_or_none()
    if not article:
        raise HTTPException(status_code=404, detail="ナレッジ記事が見つかりません")
    update_data = payload.model_dump(exclude_none=True)
    update_data["updated_by"] = current_user.id
    for k, v in update_data.items():
        setattr(article, k, v)
    await db.commit()
    await db.refresh(article)
    return ApiResponse(data=KnowledgeArticleResponse.model_validate(article), message="ナレッジ記事を更新しました")


@router.delete("/articles/{article_id}", response_model=ApiResponse[dict])
async def delete_article(
    article_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_roles([UserRole.ADMIN])),
):
    from datetime import datetime, timezone
    result = await db.execute(
        select(KnowledgeArticle).where(
            and_(KnowledgeArticle.id == article_id, KnowledgeArticle.deleted_at.is_(None))
        )
    )
    article = result.scalar_one_or_none()
    if not article:
        raise HTTPException(status_code=404, detail="ナレッジ記事が見つかりません")
    article.deleted_at = datetime.now(timezone.utc)
    article.updated_by = current_user.id
    await db.commit()
    return ApiResponse(data={}, message="ナレッジ記事を削除しました")


# ---------- AI Search ----------

@router.post("/search", response_model=AiSearchResponse)
async def ai_search(
    payload: AiSearchRequest,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_roles([UserRole.ADMIN, UserRole.PROJECT_MANAGER, UserRole.SITE_SUPERVISOR,
                                        UserRole.COST_MANAGER, UserRole.IT_OPERATOR, UserRole.VIEWER])),
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
    keyword = f"%{payload.query}%"
    conditions = [
        KnowledgeArticle.deleted_at.is_(None),
        KnowledgeArticle.is_published.is_(True),
        or_(
            KnowledgeArticle.title.ilike(keyword),
            KnowledgeArticle.content.ilike(keyword),
            KnowledgeArticle.tags.ilike(keyword),
        )
    ]
    if payload.category:
        conditions.append(KnowledgeArticle.category == payload.category)

    result = await db.execute(
        select(KnowledgeArticle).where(and_(*conditions))
        .order_by(KnowledgeArticle.view_count.desc())
        .limit(payload.max_results)
    )
    articles = result.scalars().all()

    search_results: List[AiSearchResult] = []
    for article in articles:
        content = article.content
        excerpt = content[:200] + "..." if len(content) > 200 else content
        # スコア計算（タイトルマッチ優遇）
        score = 1.0 if payload.query.lower() in article.title.lower() else 0.7
        search_results.append(AiSearchResult(
            article_id=article.id,
            title=article.title,
            excerpt=excerpt,
            category=article.category,
            score=score,
            tags=article.tags,
        ))

    # AI回答生成（OpenAI APIキーが設定されている場合）
    ai_answer: str | None = None
    model_used: str | None = None
    tokens_used: int | None = None

    openai_key = os.getenv("OPENAI_API_KEY")
    if openai_key and articles:
        try:
            import openai
            context = "\n\n".join([f"【{a.title}】\n{a.content[:500]}" for a in articles[:3]])
            client = openai.AsyncOpenAI(api_key=openai_key)
            response = await client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": "建設業のナレッジベースを参照して、ユーザーの質問に日本語で回答してください。"},
                    {"role": "user", "content": f"参考情報:\n{context}\n\n質問: {payload.query}"},
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
    log = AiSearchLog(
        user_id=current_user.id,
        query=payload.query,
        ai_response=ai_answer,
        model_used=model_used,
        tokens_used=tokens_used,
        response_time_ms=elapsed_ms,
    )
    db.add(log)
    await db.commit()

    return AiSearchResponse(
        query=payload.query,
        results=search_results,
        ai_answer=ai_answer,
        model_used=model_used,
        total_results=len(search_results),
    )
