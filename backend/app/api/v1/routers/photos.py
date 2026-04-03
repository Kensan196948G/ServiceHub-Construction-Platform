"""
写真・資料管理APIルーター
POST   /api/v1/projects/{id}/photos        アップロード
GET    /api/v1/projects/{id}/photos        一覧
GET    /api/v1/photos/{id}                 詳細 + プリサインドURL
PUT    /api/v1/photos/{id}                 メタデータ更新
DELETE /api/v1/photos/{id}                 論理削除
"""

import math
import uuid
from typing import Annotated

import structlog
from fastapi import (
    APIRouter,
    Depends,
    File,
    Form,
    HTTPException,
    Query,
    UploadFile,
    status,
)
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.rbac import UserRole, require_roles
from app.db.base import get_db
from app.models.user import User
from app.schemas.common import ApiResponse, PaginatedResponse, PaginationMeta
from app.schemas.photo import PhotoResponse, PhotoUpdate
from app.services.photo_service import (
    FileTooLargeError,
    InvalidFileTypeError,
    PhotoNotFoundError,
    PhotoService,
    UploadFailedError,
)

router = APIRouter(tags=["写真・資料管理"])
logger = structlog.get_logger()


@router.post(
    "/projects/{project_id}/photos",
    response_model=ApiResponse[PhotoResponse],
    status_code=status.HTTP_201_CREATED,
)
async def upload_photo(
    project_id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[
        User,
        Depends(
            require_roles(
                UserRole.ADMIN, UserRole.PROJECT_MANAGER, UserRole.SITE_SUPERVISOR
            )
        ),
    ],
    file: UploadFile = File(...),
    category: str = Form(default="GENERAL"),
    caption: str | None = Form(default=None),
    daily_report_id: uuid.UUID | None = Form(default=None),
):
    file_data = await file.read()
    svc = PhotoService(db)
    try:
        response_data = await svc.upload(
            project_id=project_id,
            file_data=file_data,
            filename=file.filename or "upload",
            content_type=file.content_type,
            category=category,
            caption=caption,
            daily_report_id=daily_report_id,
            created_by=current_user.id,
        )
    except InvalidFileTypeError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    except FileTooLargeError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    except UploadFailedError as e:
        raise HTTPException(status_code=500, detail=str(e)) from e
    return ApiResponse(data=response_data)


@router.get(
    "/projects/{project_id}/photos", response_model=PaginatedResponse[PhotoResponse]
)
async def list_photos(
    project_id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[
        User,
        Depends(
            require_roles(
                UserRole.ADMIN,
                UserRole.PROJECT_MANAGER,
                UserRole.SITE_SUPERVISOR,
                UserRole.VIEWER,
            )
        ),
    ],
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=20, ge=1, le=100),
    category: str | None = Query(default=None),
):
    svc = PhotoService(db)
    photos, total = await svc.list_photos(project_id, page, per_page, category)
    return PaginatedResponse(
        data=photos,
        meta=PaginationMeta(
            total=total,
            page=page,
            per_page=per_page,
            pages=math.ceil(total / per_page) if total > 0 else 0,
        ),
    )


@router.get("/photos/{photo_id}", response_model=ApiResponse[PhotoResponse])
async def get_photo(
    photo_id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[
        User,
        Depends(
            require_roles(
                UserRole.ADMIN,
                UserRole.PROJECT_MANAGER,
                UserRole.SITE_SUPERVISOR,
                UserRole.VIEWER,
            )
        ),
    ],
):
    svc = PhotoService(db)
    try:
        response_data = await svc.get_photo(photo_id)
    except PhotoNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e
    return ApiResponse(data=response_data)


@router.put("/photos/{photo_id}", response_model=ApiResponse[PhotoResponse])
async def update_photo(
    photo_id: uuid.UUID,
    payload: PhotoUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[
        User,
        Depends(
            require_roles(
                UserRole.ADMIN, UserRole.PROJECT_MANAGER, UserRole.SITE_SUPERVISOR
            )
        ),
    ],
):
    svc = PhotoService(db)
    try:
        response_data = await svc.update_photo(photo_id, payload)
    except PhotoNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e
    return ApiResponse(data=response_data)


@router.delete("/photos/{photo_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_photo(
    photo_id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[
        User, Depends(require_roles(UserRole.ADMIN, UserRole.PROJECT_MANAGER))
    ],
):
    svc = PhotoService(db)
    try:
        await svc.delete_photo(photo_id)
    except PhotoNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e
    return None
