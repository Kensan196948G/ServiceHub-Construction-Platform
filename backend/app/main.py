"""
ServiceHub Construction Platform - FastAPI メインアプリケーション
"""

import asyncio
from contextlib import asynccontextmanager

import structlog
import structlog.contextvars
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from prometheus_fastapi_instrumentator import Instrumentator
from slowapi.errors import RateLimitExceeded
from sqlalchemy import text
from starlette.requests import Request

from app.api.v1.router import api_router
from app.core.config import settings
from app.core.exceptions import register_exception_handlers
from app.db.base import engine
from app.middleware.logging import RequestLoggingMiddleware
from app.middleware.rate_limit import limiter

# Configure structlog: merge contextvars (request_id etc.) into every log line.
structlog.configure(
    processors=[
        structlog.contextvars.merge_contextvars,
        structlog.stdlib.add_log_level,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.dev.ConsoleRenderer(),
    ],
    wrapper_class=structlog.make_filtering_bound_logger(20),  # INFO
    context_class=dict,
    logger_factory=structlog.PrintLoggerFactory(),
    cache_logger_on_first_use=True,
)

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


_is_development = settings.ENVIRONMENT != "production"

app = FastAPI(
    title=settings.APP_NAME + " API",
    description="""
建設業向け AI 統合業務プラットフォーム

## 認証

全ての API は Bearer トークン認証が必要です（ヘルスチェック系を除く）。

```
POST /api/v1/auth/login  → { access_token, refresh_token }
Authorization: Bearer {access_token}
```

アクセストークンの有効期限は 15 分です。
期限切れ後は `/auth/refresh` で再取得してください。

## ロール・権限

| ロール | 説明 |
|---|---|
| `admin` | 全操作 + ユーザー管理 |
| `project_manager` | 案件CRUD・承認 |
| `site_supervisor` | 日報・安全確認 |
| `cost_manager` | 原価管理 |
| `it_operator` | ITSM・ナレッジ |
| `viewer` | 読み取りのみ |

## エラーレスポンス

全エラーは以下の形式で返されます:

```json
{ "success": false, "error": { "code": "ERROR_CODE", "message": "説明" } }
```

## レート制限

- ログイン: 5 回/分
- トークンリフレッシュ: 10 回/分

制限超過時は HTTP 429 が返されます。
""",
    version=settings.APP_VERSION,
    docs_url="/docs" if _is_development else None,
    redoc_url="/redoc" if _is_development else None,
    openapi_url="/api/v1/openapi.json" if _is_development else None,
    lifespan=lifespan,
)

# ── レートリミッター登録 ─────────────────────────────
# app.state.limiter が必須 (slowapi がこれを参照する)
app.state.limiter = limiter


@app.exception_handler(RateLimitExceeded)
async def rate_limit_handler(request: Request, exc: RateLimitExceeded) -> JSONResponse:
    """レート制限超過時にプロジェクト統一エラー形式で 429 を返す。"""
    return JSONResponse(
        status_code=429,
        content={
            "success": False,
            "error": {
                "code": "RATE_LIMIT_EXCEEDED",
                "message": f"レート制限超過: {exc.detail}",
            },
        },
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
    """後方互換ヘルスチェック (liveness 相当)"""
    return {
        "status": "healthy",
        "service": "servicehub-api",
        "version": settings.APP_VERSION,
    }


@app.get("/health/live", tags=["System"])
async def health_live():
    """Liveness probe — プロセス生存確認 (DB/Redis 接続不問)。

    コンテナオーケストレータが失敗を検知すると pod を再起動する。
    DB 障害では kill しないよう DB チェックは含めない。
    """
    return {"status": "alive", "service": "servicehub-api"}


@app.get("/health/ready", tags=["System"])
async def health_ready():
    """Readiness probe — DB + Redis 接続確認。

    失敗 (503) 時はトラフィックが外れるがコンテナは再起動しない。
    DB 接続: engine.connect() + SELECT 1 (使い捨て接続で軽量)。
    Redis 接続: get_redis().ping()。
    """
    # DB check
    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"db_not_ready: {exc}") from exc

    # Redis check
    try:
        from app.core.redis_client import get_redis

        redis = await get_redis()
        await redis.ping()
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"redis_not_ready: {exc}") from exc

    return {"status": "ready", "service": "servicehub-api"}


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
