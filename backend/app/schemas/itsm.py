"""ITSMスキーマ（Pydantic v2）"""

from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, Field


class IncidentCreate(BaseModel):
    title: str = Field(..., max_length=300)
    description: str
    category: str = Field(
        "SYSTEM", pattern="^(SYSTEM|NETWORK|APPLICATION|SECURITY|OTHER)$"
    )
    priority: str = Field("MEDIUM", pattern="^(CRITICAL|HIGH|MEDIUM|LOW)$")
    severity: str = Field("MEDIUM", pattern="^(CRITICAL|HIGH|MEDIUM|LOW)$")
    assigned_to: uuid.UUID | None = None
    project_id: uuid.UUID | None = None


class IncidentUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    priority: str | None = None
    severity: str | None = None
    status: str | None = Field(
        None, pattern="^(OPEN|IN_PROGRESS|PENDING|RESOLVED|CLOSED)$"
    )
    assigned_to: uuid.UUID | None = None
    resolution: str | None = None


class IncidentResponse(BaseModel):
    model_config = {"from_attributes": True}
    id: uuid.UUID
    incident_number: str
    title: str
    description: str
    category: str
    priority: str
    severity: str
    status: str
    assigned_to: uuid.UUID | None = None
    project_id: uuid.UUID | None = None
    resolution: str | None = None
    resolved_at: datetime | None = None
    created_at: datetime
    updated_at: datetime
    created_by: uuid.UUID | None = None


class ChangeRequestCreate(BaseModel):
    title: str = Field(..., max_length=300)
    description: str
    change_type: str = Field("NORMAL", pattern="^(EMERGENCY|NORMAL|STANDARD)$")
    risk_level: str = Field("MEDIUM", pattern="^(HIGH|MEDIUM|LOW)$")
    impact: str | None = None
    rollback_plan: str | None = None
    scheduled_start: datetime | None = None
    scheduled_end: datetime | None = None


class ChangeRequestUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    status: str | None = Field(
        None, pattern="^(DRAFT|REVIEW|APPROVED|IMPLEMENTING|COMPLETED|REJECTED)$"
    )
    risk_level: str | None = None
    impact: str | None = None
    rollback_plan: str | None = None
    scheduled_start: datetime | None = None
    scheduled_end: datetime | None = None


class ChangeRequestResponse(BaseModel):
    model_config = {"from_attributes": True}
    id: uuid.UUID
    change_number: str
    title: str
    description: str
    change_type: str
    risk_level: str
    status: str
    impact: str | None = None
    rollback_plan: str | None = None
    scheduled_start: datetime | None = None
    scheduled_end: datetime | None = None
    approved_by: uuid.UUID | None = None
    approved_at: datetime | None = None
    created_at: datetime
    updated_at: datetime
    created_by: uuid.UUID | None = None
