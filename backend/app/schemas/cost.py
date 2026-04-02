"""原価・工数スキーマ"""
import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import Optional
from pydantic import BaseModel, Field


class CostRecordCreate(BaseModel):
    project_id: uuid.UUID
    record_date: date
    category: str
    description: str
    budgeted_amount: Decimal = Field(default=0, ge=0)
    actual_amount: Decimal = Field(default=0, ge=0)
    vendor_name: Optional[str] = None
    invoice_number: Optional[str] = None
    notes: Optional[str] = None


class CostRecordResponse(BaseModel):
    id: uuid.UUID
    project_id: uuid.UUID
    record_date: date
    category: str
    description: str
    budgeted_amount: Decimal
    actual_amount: Decimal
    vendor_name: Optional[str]
    invoice_number: Optional[str]
    notes: Optional[str]
    created_at: datetime
    model_config = {"from_attributes": True}


class CostSummary(BaseModel):
    """原価サマリー（予実対比）"""
    project_id: uuid.UUID
    total_budgeted: Decimal
    total_actual: Decimal
    variance: Decimal
    variance_rate: float
    by_category: dict


class WorkHourCreate(BaseModel):
    project_id: uuid.UUID
    work_date: date
    hours: Decimal = Field(ge=0, le=24)
    work_type: str = "REGULAR"
    description: Optional[str] = None
    worker_id: Optional[uuid.UUID] = None


class WorkHourResponse(BaseModel):
    id: uuid.UUID
    project_id: uuid.UUID
    work_date: date
    hours: Decimal
    work_type: str
    description: Optional[str]
    created_at: datetime
    model_config = {"from_attributes": True}
