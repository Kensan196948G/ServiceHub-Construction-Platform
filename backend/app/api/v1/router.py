"""
APIルーター統合 - 全v1エンドポイント
"""
from fastapi import APIRouter

from app.api.v1 import auth
from app.api.v1.routers import projects, daily_reports

api_router = APIRouter()
api_router.include_router(auth.router)
api_router.include_router(projects.router)
api_router.include_router(daily_reports.router)
