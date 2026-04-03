"""
ユーザー管理スキーマ（Pydantic v2）
"""

import uuid
from datetime import datetime

from pydantic import BaseModel, EmailStr, Field


class UserCreate(BaseModel):
    email: EmailStr
    full_name: str = Field(..., min_length=1, max_length=100)
    password: str = Field(..., min_length=8)
    role: str = "VIEWER"


class UserUpdate(BaseModel):
    full_name: str | None = Field(None, max_length=100)
    role: str | None = None
    is_active: bool | None = None


class UserListResponse(BaseModel):
    id: uuid.UUID
    email: str
    full_name: str
    role: str
    is_active: bool
    last_login_at: datetime | None
    created_at: datetime
    model_config = {"from_attributes": True}
