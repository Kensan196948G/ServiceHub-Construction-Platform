"""
グローバル例外ハンドラ
統一エラーレスポンス形式
"""

import structlog
from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

logger = structlog.get_logger()


# ── サービス例外基底クラス ──────────────────────────────
class ServiceError(Exception):
    """サービス層の基底例外。status_code を持ちグローバルハンドラで自動変換される。"""

    status_code: int = 500
    detail: str = "サービスエラーが発生しました"

    def __init__(self, detail: str | None = None):
        self.detail = detail or self.__class__.detail
        super().__init__(self.detail)


class NotFoundError(ServiceError):
    """リソースが見つからない (404)"""

    status_code = 404
    detail = "リソースが見つかりません"


class BadRequestError(ServiceError):
    """不正なリクエスト (400)"""

    status_code = 400
    detail = "リクエストが不正です"


class ConflictError(ServiceError):
    """競合 (409)"""

    status_code = 409
    detail = "リソースが競合しています"


class ForbiddenError(ServiceError):
    """アクセス拒否 (403)"""

    status_code = 403
    detail = "アクセスが拒否されました"


def register_exception_handlers(app: FastAPI) -> None:
    """例外ハンドラ登録"""

    @app.exception_handler(ServiceError)
    async def service_error_handler(request: Request, exc: ServiceError):
        logger.warning(
            "service_error",
            error_type=type(exc).__name__,
            status_code=exc.status_code,
            detail=exc.detail,
            path=request.url.path,
        )
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "success": False,
                "error": {
                    "code": type(exc).__name__,
                    "message": exc.detail,
                },
            },
        )

    @app.exception_handler(StarletteHTTPException)
    async def http_exception_handler(request: Request, exc: StarletteHTTPException):
        logger.warning(
            "http_error",
            status_code=exc.status_code,
            detail=exc.detail,
            path=request.url.path,
        )
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "success": False,
                "error": {
                    "code": f"HTTP_{exc.status_code}",
                    "message": str(exc.detail),
                },
            },
        )

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(
        request: Request, exc: RequestValidationError
    ):
        errors = exc.errors()
        first = errors[0] if errors else {}
        field = ".".join(str(loc) for loc in first.get("loc", []))
        logger.warning("validation_error", errors=errors, path=request.url.path)
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content={
                "success": False,
                "error": {
                    "code": "VALIDATION_ERROR",
                    "message": first.get("msg", "入力値が不正です"),
                    "field": field,
                },
            },
        )

    @app.exception_handler(Exception)
    async def unhandled_exception_handler(request: Request, exc: Exception):
        logger.error(
            "unhandled_error", error=str(exc), path=request.url.path, exc_info=True
        )
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "success": False,
                "error": {
                    "code": "INTERNAL_ERROR",
                    "message": "サーバー内部エラーが発生しました",
                },
            },
        )
