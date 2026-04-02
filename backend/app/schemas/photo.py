"""
写真・資料スキーマ（Pydantic v2）
"""

import uuid
from datetime import datetime

from pydantic import BaseModel


class PhotoResponse(BaseModel):
    id: uuid.UUID
    project_id: uuid.UUID
    daily_report_id: uuid.UUID | None
    file_name: str
    original_name: str
    content_type: str
    file_size: int
    category: str
    caption: str | None
    taken_at: datetime | None
    download_url: str | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class PhotoUpdate(BaseModel):
    caption: str | None = None
    category: str | None = None
    taken_at: datetime | None = None
    daily_report_id: uuid.UUID | None = None
