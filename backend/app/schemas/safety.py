"""安全・品質スキーマ"""
import uuid
from datetime import date, datetime
from typing import Optional
from pydantic import BaseModel, Field


class SafetyCheckCreate(BaseModel):
    project_id: uuid.UUID
    check_date: date
    check_type: str = "DAILY"
    items_total: int = Field(default=0, ge=0)
    items_ok: int = Field(default=0, ge=0)
    items_ng: int = Field(default=0, ge=0)
    overall_result: str = "PENDING"
    notes: Optional[str] = None


class SafetyCheckResponse(BaseModel):
    id: uuid.UUID
    project_id: uuid.UUID
    check_date: date
    check_type: str
    items_total: int
    items_ok: int
    items_ng: int
    overall_result: str
    notes: Optional[str]
    created_at: datetime
    model_config = {"from_attributes": True}


class QualityInspectionCreate(BaseModel):
    project_id: uuid.UUID
    inspection_date: date
    inspection_type: str
    target_item: str
    standard_value: Optional[str] = None
    measured_value: Optional[str] = None
    result: str = "PENDING"
    remarks: Optional[str] = None


class QualityInspectionResponse(BaseModel):
    id: uuid.UUID
    project_id: uuid.UUID
    inspection_date: date
    inspection_type: str
    target_item: str
    standard_value: Optional[str]
    measured_value: Optional[str]
    result: str
    remarks: Optional[str]
    created_at: datetime
    model_config = {"from_attributes": True}
