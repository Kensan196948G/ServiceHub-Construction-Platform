"""
写真・資料管理APIルーター
POST   /api/v1/projects/{id}/photos        アップロード
GET    /api/v1/projects/{id}/photos        一覧
GET    /api/v1/photos/{id}                 詳細 + プリサインドURL
PUT    /api/v1/photos/{id}                 メタデータ更新
DELETE /api/v1/photos/{id}                 論理削除
"""
import uuid
import math
from typing import Annotated, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.rbac import UserRole, require_roles
from app.db.base import get_db
from app.models.user import User
from app.repositories.photo import PhotoRepository
from app.schemas.common import ApiResponse, PaginatedResponse, PaginationMeta
from app.schemas.photo import PhotoResponse, PhotoUpdate
from app.services.storage import storage_service

router = APIRouter(tags=["写真・資料管理"])

ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp", "application/pdf"}
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB


@router.post("/projects/{project_id}/photos",
             response_model=ApiResponse[PhotoResponse], status_code=status.HTTP_201_CREATED)
async def upload_photo(
    project_id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_roles(
        UserRole.ADMIN, UserRole.PROJECT_MANAGER, UserRole.SITE_SUPERVISOR
    ))],
    file: UploadFile = File(...),
    category: str = Form(default="GENERAL"),
    caption: Optional[str] = Form(default=None),
    daily_report_id: Optional[uuid.UUID] = Form(default=None),
):
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(status_code=400,
                            detail=f"許可されていないファイル形式: {file.content_type}")
    file_data = await file.read()
    if len(file_data) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="ファイルサイズが50MBを超えています")

    object_key = storage_service.generate_object_key(
        str(project_id), category, file.filename or "upload"
    )
    try:
        storage_service.upload_file(file_data, object_key, file.content_type)
    except Exception:
        raise HTTPException(status_code=500, detail="ファイルアップロードに失敗しました")

    repo = PhotoRepository(db)
    photo = await repo.create(
        project_id=project_id,
        file_name=object_key.split("/")[-1],
        original_name=file.filename or "upload",
        content_type=file.content_type,
        file_size=len(file_data),
        bucket_name=storage_service.bucket,
        object_key=object_key,
        category=category,
        caption=caption,
        daily_report_id=daily_report_id,
        created_by=current_user.id,
    )
    response_data = PhotoResponse.model_validate(photo)
    try:
        response_data.download_url = storage_service.get_presigned_url(object_key)
    except Exception:
        pass
    return ApiResponse(data=response_data)


@router.get("/projects/{project_id}/photos", response_model=PaginatedResponse[PhotoResponse])
async def list_photos(
    project_id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_roles(
        UserRole.ADMIN, UserRole.PROJECT_MANAGER, UserRole.SITE_SUPERVISOR, UserRole.VIEWER
    ))],
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=20, ge=1, le=100),
    category: Optional[str] = Query(default=None),
):
    repo = PhotoRepository(db)
    offset = (page - 1) * per_page
    photos = await repo.list(project_id, offset=offset, limit=per_page, category=category)
    total = await repo.count(project_id, category=category)
    return PaginatedResponse(
        data=[PhotoResponse.model_validate(p) for p in photos],
        meta=PaginationMeta(
            total=total, page=page, per_page=per_page,
            pages=math.ceil(total / per_page) if total > 0 else 0,
        ),
    )


@router.get("/photos/{photo_id}", response_model=ApiResponse[PhotoResponse])
async def get_photo(
    photo_id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_roles(
        UserRole.ADMIN, UserRole.PROJECT_MANAGER, UserRole.SITE_SUPERVISOR, UserRole.VIEWER
    ))],
):
    repo = PhotoRepository(db)
    photo = await repo.get_by_id(photo_id)
    if not photo:
        raise HTTPException(status_code=404, detail="写真が見つかりません")
    response_data = PhotoResponse.model_validate(photo)
    try:
        response_data.download_url = storage_service.get_presigned_url(photo.object_key)
    except Exception:
        pass
    return ApiResponse(data=response_data)


@router.put("/photos/{photo_id}", response_model=ApiResponse[PhotoResponse])
async def update_photo(
    photo_id: uuid.UUID,
    payload: PhotoUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_roles(
        UserRole.ADMIN, UserRole.PROJECT_MANAGER, UserRole.SITE_SUPERVISOR
    ))],
):
    repo = PhotoRepository(db)
    photo = await repo.get_by_id(photo_id)
    if not photo:
        raise HTTPException(status_code=404, detail="写真が見つかりません")
    photo = await repo.update(photo, payload)
    return ApiResponse(data=PhotoResponse.model_validate(photo))


@router.delete("/photos/{photo_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_photo(
    photo_id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_roles(UserRole.ADMIN, UserRole.PROJECT_MANAGER))],
):
    repo = PhotoRepository(db)
    photo = await repo.get_by_id(photo_id)
    if not photo:
        raise HTTPException(status_code=404, detail="写真が見つかりません")
    try:
        storage_service.delete_file(photo.object_key)
    except Exception:
        pass
    await repo.soft_delete(photo)
    return None
