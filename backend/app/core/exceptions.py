"""
グローバル例外ハンドラ
統一エラーレスポンス形式
"""
from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
import structlog

logger = structlog.get_logger()


def register_exception_handlers(app: FastAPI) -> None:
    """例外ハンドラ登録"""

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
                "error": {"code": f"HTTP_{exc.status_code}", "message": str(exc.detail)},
            },
        )

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(request: Request, exc: RequestValidationError):
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
        logger.error("unhandled_error", error=str(exc), path=request.url.path, exc_info=True)
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "success": False,
                "error": {"code": "INTERNAL_ERROR", "message": "サーバー内部エラーが発生しました"},
            },
        )
