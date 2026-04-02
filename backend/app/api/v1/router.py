"""
APIルーター統合
全v1エンドポイントをここで束ねる
"""
from fastapi import APIRouter

from app.api.v1 import auth

api_router = APIRouter()
api_router.include_router(auth.router)
