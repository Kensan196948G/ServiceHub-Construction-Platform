"""
工事案件スキーマ（Pydantic v2）
"""
import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, Field


class ProjectCreate(BaseModel):
    project_code: str = Field(..., min_length=3, max_length=50)
    name: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    client_name: str = Field(..., min_length=1, max_length=200)
    site_address: Optional[str] = Field(None, max_length=500)
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    budget: Optional[Decimal] = Field(None, ge=0)
    manager_id: Optional[uuid.UUID] = None


class ProjectUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = None
    client_name: Optional[str] = Field(None, min_length=1, max_length=200)
    site_address: Optional[str] = None
    status: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    budget: Optional[Decimal] = Field(None, ge=0)
    manager_id: Optional[uuid.UUID] = None


class ProjectResponse(BaseModel):
    id: uuid.UUID
    project_code: str
    name: str
    description: Optional[str]
    client_name: str
    site_address: Optional[str]
    status: str
    start_date: Optional[date]
    end_date: Optional[date]
    budget: Optional[Decimal]
    manager_id: Optional[uuid.UUID]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
