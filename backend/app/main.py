"""
ServiceHub Construction Platform - FastAPI メインアプリケーション
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import structlog

from app.core.config import settings
from app.core.exceptions import register_exception_handlers
from app.api.v1.router import api_router
from app.middleware.logging import RequestLoggingMiddleware

logger = structlog.get_logger()

app = FastAPI(
    title=settings.APP_NAME + " API",
    description="建設業向けAI統合業務プラットフォーム",
    version=settings.APP_VERSION,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/api/v1/openapi.json",
)

# ── ミドルウェア登録 ──────────────────────────────────
app.add_middleware(RequestLoggingMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── 例外ハンドラ登録 ──────────────────────────────────
register_exception_handlers(app)

# ── ルーター登録 ──────────────────────────────────────
app.include_router(api_router, prefix=settings.API_V1_PREFIX)

# ── ヘルスチェック ────────────────────────────────────
@app.get("/health", tags=["System"])
async def health_check():
    """ヘルスチェックエンドポイント"""
    return {
        "status": "healthy",
        "service": "servicehub-api",
        "version": settings.APP_VERSION,
    }

@app.get("/api/v1/status", tags=["System"])
async def api_status():
    """API ステータス確認"""
    return {
        "success": True,
        "data": {
            "api": settings.APP_NAME,
            "version": settings.APP_VERSION,
            "environment": settings.ENVIRONMENT,
            "phase": "Phase1 - 基盤構築中",
        }
    }

logger.info("ServiceHub API starting", version=settings.APP_VERSION)
