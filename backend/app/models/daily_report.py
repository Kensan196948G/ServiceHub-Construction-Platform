"""
日報モデル（SQLAlchemy）
現場作業日報・安全確認・天気・作業員記録
"""

import uuid
from datetime import date, datetime

from sqlalchemy import Date, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class DailyReport(Base):
    __tablename__ = "daily_reports"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    project_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    report_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    weather: Mapped[str | None] = mapped_column(String(20), nullable=True)
    # SUNNY / CLOUDY / RAINY / SNOWY
    temperature: Mapped[int | None] = mapped_column(Integer, nullable=True)
    worker_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    work_content: Mapped[str | None] = mapped_column(Text, nullable=True)
    safety_check: Mapped[bool] = mapped_column(nullable=False, default=False)
    safety_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    progress_rate: Mapped[int | None] = mapped_column(Integer, nullable=True)  # 0-100
    issues: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="DRAFT")
    # DRAFT / SUBMITTED / APPROVED

    # 監査カラム
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
    deleted_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    created_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), nullable=True
    )
    updated_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), nullable=True
    )

    def __repr__(self) -> str:
        return f"<DailyReport project={self.project_id} date={self.report_date}>"
