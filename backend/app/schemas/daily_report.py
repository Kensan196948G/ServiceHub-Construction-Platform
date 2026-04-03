"""
日報スキーマ（Pydantic v2）
"""

import uuid
from datetime import date, datetime

from pydantic import BaseModel, Field


class DailyReportCreate(BaseModel):
    project_id: uuid.UUID
    report_date: date
    weather: str | None = None
    temperature: int | None = Field(None, ge=-50, le=60)
    worker_count: int = Field(default=0, ge=0)
    work_content: str | None = None
    safety_check: bool = False
    safety_notes: str | None = None
    progress_rate: int | None = Field(None, ge=0, le=100)
    issues: str | None = None


class DailyReportUpdate(BaseModel):
    weather: str | None = None
    temperature: int | None = Field(None, ge=-50, le=60)
    worker_count: int | None = Field(None, ge=0)
    work_content: str | None = None
    safety_check: bool | None = None
    safety_notes: str | None = None
    progress_rate: int | None = Field(None, ge=0, le=100)
    issues: str | None = None
    status: str | None = None


class DailyReportResponse(BaseModel):
    id: uuid.UUID
    project_id: uuid.UUID
    report_date: date
    weather: str | None
    temperature: int | None
    worker_count: int
    work_content: str | None
    safety_check: bool
    safety_notes: str | None
    progress_rate: int | None
    issues: str | None
    status: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
