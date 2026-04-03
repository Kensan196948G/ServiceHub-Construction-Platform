"""安全・品質スキーマ"""

import uuid
from datetime import date, datetime

from pydantic import BaseModel, Field


class SafetyCheckCreate(BaseModel):
    project_id: uuid.UUID
    check_date: date
    check_type: str = "DAILY"
    items_total: int = Field(default=0, ge=0)
    items_ok: int = Field(default=0, ge=0)
    items_ng: int = Field(default=0, ge=0)
    overall_result: str = "PENDING"
    notes: str | None = None


class SafetyCheckResponse(BaseModel):
    id: uuid.UUID
    project_id: uuid.UUID
    check_date: date
    check_type: str
    items_total: int
    items_ok: int
    items_ng: int
    overall_result: str
    notes: str | None
    created_at: datetime
    model_config = {"from_attributes": True}


class SafetyCheckUpdate(BaseModel):
    check_date: date | None = None
    check_type: str | None = None
    items_total: int | None = Field(default=None, ge=0)
    items_ok: int | None = Field(default=None, ge=0)
    items_ng: int | None = Field(default=None, ge=0)
    overall_result: str | None = None
    notes: str | None = None


class QualityInspectionCreate(BaseModel):
    project_id: uuid.UUID
    inspection_date: date
    inspection_type: str
    target_item: str
    standard_value: str | None = None
    measured_value: str | None = None
    result: str = "PENDING"
    remarks: str | None = None


class QualityInspectionResponse(BaseModel):
    id: uuid.UUID
    project_id: uuid.UUID
    inspection_date: date
    inspection_type: str
    target_item: str
    standard_value: str | None
    measured_value: str | None
    result: str
    remarks: str | None
    created_at: datetime
    model_config = {"from_attributes": True}


class QualityInspectionUpdate(BaseModel):
    inspection_date: date | None = None
    inspection_type: str | None = None
    target_item: str | None = None
    standard_value: str | None = None
    measured_value: str | None = None
    result: str | None = None
    remarks: str | None = None
