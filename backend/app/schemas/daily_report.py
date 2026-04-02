"""
日報スキーマ（Pydantic v2）
"""
import uuid
from datetime import date, datetime
from typing import Optional
from pydantic import BaseModel, Field


class DailyReportCreate(BaseModel):
    project_id: uuid.UUID
    report_date: date
    weather: Optional[str] = None
    temperature: Optional[int] = Field(None, ge=-50, le=60)
    worker_count: int = Field(default=0, ge=0)
    work_content: Optional[str] = None
    safety_check: bool = False
    safety_notes: Optional[str] = None
    progress_rate: Optional[int] = Field(None, ge=0, le=100)
    issues: Optional[str] = None


class DailyReportUpdate(BaseModel):
    weather: Optional[str] = None
    temperature: Optional[int] = Field(None, ge=-50, le=60)
    worker_count: Optional[int] = Field(None, ge=0)
    work_content: Optional[str] = None
    safety_check: Optional[bool] = None
    safety_notes: Optional[str] = None
    progress_rate: Optional[int] = Field(None, ge=0, le=100)
    issues: Optional[str] = None
    status: Optional[str] = None


class DailyReportResponse(BaseModel):
    id: uuid.UUID
    project_id: uuid.UUID
    report_date: date
    weather: Optional[str]
    temperature: Optional[int]
    worker_count: int
    work_content: Optional[str]
    safety_check: bool
    safety_notes: Optional[str]
    progress_rate: Optional[int]
    issues: Optional[str]
    status: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
