"""
共通レスポンス・例外スキーマ（Pydantic v2）
全APIレスポンスの統一フォーマット
"""
from typing import Any, Generic, TypeVar
from pydantic import BaseModel

T = TypeVar("T")


class ApiResponse(BaseModel, Generic[T]):
    """統一APIレスポンス"""
    success: bool = True
    data: T | None = None
    message: str | None = None


class ErrorDetail(BaseModel):
    code: str
    message: str
    field: str | None = None


class ErrorResponse(BaseModel):
    success: bool = False
    error: ErrorDetail


class PaginationMeta(BaseModel):
    total: int
    page: int
    per_page: int
    pages: int


class PaginatedResponse(BaseModel, Generic[T]):
    """ページネーション付きレスポンス"""
    success: bool = True
    data: list[T]
    meta: PaginationMeta
