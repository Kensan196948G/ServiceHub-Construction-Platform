"""
工事案件スキーマ（Pydantic v2）
"""

import uuid
from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, Field


class ProjectCreate(BaseModel):
    project_code: str = Field(..., min_length=3, max_length=50)
    name: str = Field(..., min_length=1, max_length=200)
    description: str | None = None
    client_name: str = Field(..., min_length=1, max_length=200)
    site_address: str | None = Field(None, max_length=500)
    start_date: date | None = None
    end_date: date | None = None
    budget: Decimal | None = Field(None, ge=0)
    manager_id: uuid.UUID | None = None


class ProjectUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=200)
    description: str | None = None
    client_name: str | None = Field(None, min_length=1, max_length=200)
    site_address: str | None = None
    status: str | None = None
    start_date: date | None = None
    end_date: date | None = None
    budget: Decimal | None = Field(None, ge=0)
    manager_id: uuid.UUID | None = None


class ProjectResponse(BaseModel):
    id: uuid.UUID
    project_code: str
    name: str
    description: str | None
    client_name: str
    site_address: str | None
    status: str
    start_date: date | None
    end_date: date | None
    budget: Decimal | None
    manager_id: uuid.UUID | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
