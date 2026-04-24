"""
リクエストロギングミドルウェア
全リクエスト/レスポンスを構造化ログで記録（監査ログ）
"""

import time
import uuid

import structlog
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response
from structlog.contextvars import bind_contextvars, clear_contextvars

logger = structlog.get_logger()


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """リクエスト/レスポンスの構造化ログ記録（ISO27001監査要件対応）"""

    # Health / metrics / docs paths skip verbose logging but still get X-Request-ID
    SKIP_PATHS = {
        "/health",
        "/health/live",
        "/health/ready",
        "/metrics",
        "/docs",
        "/redoc",
        "/api/v1/openapi.json",
    }

    async def dispatch(self, request: Request, call_next) -> Response:
        # Propagate X-Request-ID from upstream or generate a fresh one.
        # Binding to structlog contextvars ensures all downstream log calls
        # (handlers, services) automatically carry request_id without manual passing.
        request_id = request.headers.get("X-Request-ID") or str(uuid.uuid4())
        clear_contextvars()
        bind_contextvars(request_id=request_id)

        if request.url.path in self.SKIP_PATHS:
            response = await call_next(request)
            response.headers["X-Request-ID"] = request_id
            return response

        start_time = time.perf_counter()

        logger.info(
            "request_start",
            method=request.method,
            path=request.url.path,
            client_ip=request.client.host if request.client else "unknown",
        )

        response = await call_next(request)
        elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)

        logger.info(
            "request_end",
            method=request.method,
            path=request.url.path,
            status_code=response.status_code,
            elapsed_ms=elapsed_ms,
        )

        response.headers["X-Request-ID"] = request_id
        return response
