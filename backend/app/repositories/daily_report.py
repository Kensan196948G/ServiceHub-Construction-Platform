"""
日報リポジトリ（DB操作）
"""

import uuid
from datetime import date, datetime, timezone

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.daily_report import DailyReport
from app.schemas.daily_report import DailyReportCreate, DailyReportUpdate


class DailyReportRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_id(self, report_id: uuid.UUID) -> DailyReport | None:
        result = await self.db.execute(
            select(DailyReport).where(
                DailyReport.id == report_id, DailyReport.deleted_at.is_(None)
            )
        )
        return result.scalar_one_or_none()

    async def list(
        self,
        project_id: uuid.UUID,
        offset: int = 0,
        limit: int = 20,
        report_date: date | None = None,
    ):
        q = select(DailyReport).where(
            DailyReport.project_id == project_id, DailyReport.deleted_at.is_(None)
        )
        if report_date:
            q = q.where(DailyReport.report_date == report_date)
        q = q.order_by(DailyReport.report_date.desc()).offset(offset).limit(limit)
        result = await self.db.execute(q)
        return result.scalars().all()

    async def count(self, project_id: uuid.UUID) -> int:
        result = await self.db.execute(
            select(func.count())
            .select_from(DailyReport)
            .where(
                DailyReport.project_id == project_id, DailyReport.deleted_at.is_(None)
            )
        )
        return result.scalar_one()

    async def create(
        self, data: DailyReportCreate, created_by: uuid.UUID
    ) -> DailyReport:
        report = DailyReport(
            **data.model_dump(), created_by=created_by, updated_by=created_by
        )
        self.db.add(report)
        await self.db.flush()
        await self.db.refresh(report)
        return report

    async def update(
        self, report: DailyReport, data: DailyReportUpdate, updated_by: uuid.UUID
    ) -> DailyReport:
        for field, value in data.model_dump(exclude_none=True).items():
            setattr(report, field, value)
        report.updated_by = updated_by
        await self.db.flush()
        await self.db.refresh(report)
        return report

    async def soft_delete(self, report: DailyReport, deleted_by: uuid.UUID) -> None:
        report.deleted_at = datetime.now(timezone.utc)
        report.updated_by = deleted_by
        await self.db.flush()
