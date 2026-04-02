"""
ServiceHub Construction Platform - FastAPI メインアプリケーション
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
import structlog
import os

logger = structlog.get_logger()

app = FastAPI(
    title="ServiceHub Construction Platform API",
    description="建設業向けAI統合業務プラットフォーム",
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/api/v1/openapi.json",
)

# ── CORS ─────────────────────────────────────────────
allowed_origins = os.getenv(
    "ALLOWED_ORIGINS", "http://localhost:3000"
).split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── ヘルスチェック ────────────────────────────────────
@app.get("/health", tags=["System"])
async def health_check():
    """ヘルスチェックエンドポイント"""
    return {
        "status": "healthy",
        "service": "servicehub-api",
        "version": "0.1.0",
    }

@app.get("/api/v1/status", tags=["System"])
async def api_status():
    """API ステータス確認"""
    return {
        "success": True,
        "data": {
            "api": "ServiceHub Construction Platform",
            "version": "0.1.0",
            "environment": os.getenv("ENVIRONMENT", "development"),
            "phase": "Phase1 - 基盤構築中",
        }
    }

logger.info("ServiceHub API starting", version="0.1.0")
