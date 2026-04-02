"""ITSMスキーマ（Pydantic v2）"""
from __future__ import annotations
import uuid
from datetime import datetime
from pydantic import BaseModel, Field
from typing import Optional


class IncidentCreate(BaseModel):
    title: str = Field(..., max_length=300)
    description: str
    category: str = Field("SYSTEM", pattern="^(SYSTEM|NETWORK|APPLICATION|SECURITY|OTHER)$")
    priority: str = Field("MEDIUM", pattern="^(CRITICAL|HIGH|MEDIUM|LOW)$")
    severity: str = Field("MEDIUM", pattern="^(CRITICAL|HIGH|MEDIUM|LOW)$")
    assigned_to: Optional[uuid.UUID] = None
    project_id: Optional[uuid.UUID] = None


class IncidentUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    priority: Optional[str] = None
    severity: Optional[str] = None
    status: Optional[str] = Field(None, pattern="^(OPEN|IN_PROGRESS|PENDING|RESOLVED|CLOSED)$")
    assigned_to: Optional[uuid.UUID] = None
    resolution: Optional[str] = None


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
    assigned_to: Optional[uuid.UUID] = None
    project_id: Optional[uuid.UUID] = None
    resolution: Optional[str] = None
    resolved_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    created_by: Optional[uuid.UUID] = None


class ChangeRequestCreate(BaseModel):
    title: str = Field(..., max_length=300)
    description: str
    change_type: str = Field("NORMAL", pattern="^(EMERGENCY|NORMAL|STANDARD)$")
    risk_level: str = Field("MEDIUM", pattern="^(HIGH|MEDIUM|LOW)$")
    impact: Optional[str] = None
    rollback_plan: Optional[str] = None
    scheduled_start: Optional[datetime] = None
    scheduled_end: Optional[datetime] = None


class ChangeRequestUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = Field(None, pattern="^(DRAFT|REVIEW|APPROVED|IMPLEMENTING|COMPLETED|REJECTED)$")
    risk_level: Optional[str] = None
    impact: Optional[str] = None
    rollback_plan: Optional[str] = None
    scheduled_start: Optional[datetime] = None
    scheduled_end: Optional[datetime] = None


class ChangeRequestResponse(BaseModel):
    model_config = {"from_attributes": True}
    id: uuid.UUID
    change_number: str
    title: str
    description: str
    change_type: str
    risk_level: str
    status: str
    impact: Optional[str] = None
    rollback_plan: Optional[str] = None
    scheduled_start: Optional[datetime] = None
    scheduled_end: Optional[datetime] = None
    approved_by: Optional[uuid.UUID] = None
    approved_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    created_by: Optional[uuid.UUID] = None
