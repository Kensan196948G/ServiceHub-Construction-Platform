"""
ServiceHub Construction Platform - FastAPI メインアプリケーション
"""

import asyncio
from contextlib import asynccontextmanager

import structlog
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from prometheus_fastapi_instrumentator import Instrumentator

from app.api.v1.router import api_router
from app.core.config import settings
from app.core.exceptions import register_exception_handlers
from app.middleware.logging import RequestLoggingMiddleware

logger = structlog.get_logger()

# ── 通知リトライループ (Phase 2f) ──────────────────────
# Configurable via NOTIFICATION_RETRY_INTERVAL_SECONDS env var (default: 60s)
_RETRY_INTERVAL_SECONDS = settings.NOTIFICATION_RETRY_INTERVAL_SECONDS


async def _notification_retry_loop() -> None:  # pragma: no cover
    """transient 失敗通知を定期的に再送信するバックグラウンドループ。

    60 秒ごとに `retry_transient_failures()` を呼び出し、最大 3 回まで
    自動リトライする (failure_kind=transient の行のみ対象)。

    複数レプリカ環境では各レプリカが独立実行するが、`mark_retry_pending()` は
    FAILED 行のみを対象とするため、PENDING に戻った行を並行で 2 度処理しても
    二重送信は発生しない (Phase 2 同期実装の制約内)。
    """
    # Import here to avoid circular imports at module load time
    from app.services.notification_dispatcher import NotificationDispatcher
    from app.services.notification_session import notification_session

    while True:
        await asyncio.sleep(_RETRY_INTERVAL_SECONDS)
        try:
            async with notification_session() as db:
                retried = await NotificationDispatcher(db).retry_transient_failures()
                if retried:
                    logger.info(
                        "notification_retry_loop: retried",
                        count=len(retried),
                    )
        except asyncio.CancelledError:
            raise
        except Exception as exc:  # pylint: disable=broad-except
            logger.warning("notification_retry_loop: error", error=str(exc))


@asynccontextmanager
async def lifespan(app: FastAPI):  # type: ignore[override]
    """アプリケーション起動/終了ライフサイクル。

    startup: 通知リトライループを asyncio バックグラウンドタスクとして起動。
    shutdown: タスクをキャンセルして安全に停止する。
    """
    retry_task = asyncio.create_task(_notification_retry_loop())
    logger.info("notification_retry_loop started", interval=_RETRY_INTERVAL_SECONDS)
    try:
        yield
    finally:
        retry_task.cancel()
        try:
            await retry_task
        except asyncio.CancelledError:
            pass
        logger.info("notification_retry_loop stopped")


app = FastAPI(
    title=settings.APP_NAME + " API",
    description="建設業向けAI統合業務プラットフォーム",
    version=settings.APP_VERSION,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/api/v1/openapi.json",
    lifespan=lifespan,
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


# ── Prometheus メトリクス (Phase 3a) ─────────────────
# Exposes /metrics endpoint for Prometheus scraping.
# Instruments all routes automatically: request count, latency histogram, in-flight.
Instrumentator().instrument(app).expose(app)


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
        },
    }


logger.info("ServiceHub API starting", version=settings.APP_VERSION)
