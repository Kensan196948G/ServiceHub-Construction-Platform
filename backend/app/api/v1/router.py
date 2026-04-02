"""
APIルーター統合
全v1エンドポイントをここで束ねる
"""
from fastapi import APIRouter

from app.api.v1 import auth
from app.api.v1.routers import projects

api_router = APIRouter()
api_router.include_router(auth.router)
api_router.include_router(projects.router)
