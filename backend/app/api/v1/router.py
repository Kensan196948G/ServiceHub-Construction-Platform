"""API v1 ルーター統合"""

from fastapi import APIRouter

from app.api.v1 import auth
from app.api.v1.routers import (
    costs,
    daily_reports,
    itsm,
    knowledge,
    photos,
    projects,
    safety,
)

api_router = APIRouter()

api_router.include_router(auth.router, tags=["認証"])
api_router.include_router(projects.router)
api_router.include_router(daily_reports.router)
api_router.include_router(photos.router)
api_router.include_router(safety.router)
api_router.include_router(costs.router)
api_router.include_router(itsm.router)
api_router.include_router(knowledge.router)
