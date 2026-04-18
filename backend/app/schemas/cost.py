"""原価・工数スキーマ"""

import uuid
from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, Field


class CostRecordCreate(BaseModel):
    project_id: uuid.UUID
    record_date: date
    category: str
    description: str
    budgeted_amount: Decimal = Field(default=Decimal("0"), ge=0)
    actual_amount: Decimal = Field(default=Decimal("0"), ge=0)
    vendor_name: str | None = None
    invoice_number: str | None = None
    notes: str | None = None


class CostRecordUpdate(BaseModel):
    record_date: date | None = None
    category: str | None = None
    description: str | None = None
    budgeted_amount: Decimal | None = Field(default=None, ge=0)
    actual_amount: Decimal | None = Field(default=None, ge=0)
    vendor_name: str | None = None
    invoice_number: str | None = None
    notes: str | None = None


class CostRecordResponse(BaseModel):
    id: uuid.UUID
    project_id: uuid.UUID
    record_date: date
    category: str
    description: str
    budgeted_amount: Decimal
    actual_amount: Decimal
    vendor_name: str | None
    invoice_number: str | None
    notes: str | None
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
    description: str | None = None
    worker_id: uuid.UUID | None = None


class WorkHourResponse(BaseModel):
    id: uuid.UUID
    project_id: uuid.UUID
    work_date: date
    hours: Decimal
    work_type: str
    description: str | None
    created_at: datetime
    model_config = {"from_attributes": True}
