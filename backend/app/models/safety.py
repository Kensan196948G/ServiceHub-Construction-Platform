"""安全・品質管理モデル"""
import uuid
from datetime import date, datetime
from sqlalchemy import String, Text, Integer, Boolean, Date, DateTime, ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column
from app.db.base import Base


class SafetyCheck(Base):
    """安全確認チェックリスト"""
    __tablename__ = "safety_checks"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False, index=True
    )
    check_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    check_type: Mapped[str] = mapped_column(String(50), nullable=False, default="DAILY")
    # DAILY / WEEKLY / MONTHLY / SPECIAL
    items_total: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    items_ok: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    items_ng: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    overall_result: Mapped[str] = mapped_column(String(10), nullable=False, default="PENDING")
    # OK / NG / PENDING
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    inspector_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_by: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)


class QualityInspection(Base):
    """品質検査記録"""
    __tablename__ = "quality_inspections"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False, index=True
    )
    inspection_date: Mapped[date] = mapped_column(Date, nullable=False)
    inspection_type: Mapped[str] = mapped_column(String(100), nullable=False)
    target_item: Mapped[str] = mapped_column(String(200), nullable=False)
    standard_value: Mapped[str | None] = mapped_column(String(100), nullable=True)
    measured_value: Mapped[str | None] = mapped_column(String(100), nullable=True)
    result: Mapped[str] = mapped_column(String(10), nullable=False, default="PENDING")
    # PASS / FAIL / PENDING
    remarks: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_by: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
