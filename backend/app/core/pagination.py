"""
ページネーションユーティリティ
共通クエリパラメータ・オフセット計算
"""
from fastapi import Query
from dataclasses import dataclass


@dataclass
class Pagination:
    page: int
    per_page: int

    @property
    def offset(self) -> int:
        return (self.page - 1) * self.per_page

    @property
    def limit(self) -> int:
        return self.per_page

    def to_meta(self, total: int) -> dict:
        import math
        return {
            "total": total,
            "page": self.page,
            "per_page": self.per_page,
            "pages": math.ceil(total / self.per_page) if total > 0 else 0,
        }


def get_pagination(
    page: int = Query(default=1, ge=1, description="ページ番号"),
    per_page: int = Query(default=20, ge=1, le=100, description="1ページ件数"),
) -> Pagination:
    """FastAPI依存性注入用ページネーション"""
    return Pagination(page=page, per_page=per_page)
