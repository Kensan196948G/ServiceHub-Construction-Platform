"""
写真・資料スキーマ（Pydantic v2）
"""
import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class PhotoResponse(BaseModel):
    id: uuid.UUID
    project_id: uuid.UUID
    daily_report_id: Optional[uuid.UUID]
    file_name: str
    original_name: str
    content_type: str
    file_size: int
    category: str
    caption: Optional[str]
    taken_at: Optional[datetime]
    download_url: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class PhotoUpdate(BaseModel):
    caption: Optional[str] = None
    category: Optional[str] = None
    taken_at: Optional[datetime] = None
    daily_report_id: Optional[uuid.UUID] = None
