"""
日報サービス（ビジネスロジック層）
"""

import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.repositories.daily_report import DailyReportRepository
from app.schemas.daily_report import (
    DailyReportCreate,
    DailyReportResponse,
    DailyReportUpdate,
)


class ReportNotFoundError(Exception):
    """日報が見つからない"""


class DailyReportService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = DailyReportRepository(db)

    async def create_report(
        self, project_id: uuid.UUID, data: DailyReportCreate, created_by: uuid.UUID
    ) -> DailyReportResponse:
        data.project_id = project_id
        report = await self.repo.create(data, created_by=created_by)
        return DailyReportResponse.model_validate(report)

    async def list_reports(
        self, project_id: uuid.UUID, page: int, per_page: int
    ) -> tuple[list[DailyReportResponse], int]:
        offset = (page - 1) * per_page
        items = await self.repo.list(project_id, offset=offset, limit=per_page)
        total = await self.repo.count(project_id)
        return [DailyReportResponse.model_validate(i) for i in items], total

    async def get_report(self, report_id: uuid.UUID) -> DailyReportResponse:
        report = await self.repo.get_by_id(report_id)
        if not report:
            raise ReportNotFoundError("日報が見つかりません")
        return DailyReportResponse.model_validate(report)

    async def update_report(
        self, report_id: uuid.UUID, data: DailyReportUpdate, updated_by: uuid.UUID
    ) -> DailyReportResponse:
        report = await self.repo.get_by_id(report_id)
        if not report:
            raise ReportNotFoundError("日報が見つかりません")
        report = await self.repo.update(report, data, updated_by=updated_by)
        return DailyReportResponse.model_validate(report)

    async def delete_report(self, report_id: uuid.UUID, deleted_by: uuid.UUID) -> None:
        report = await self.repo.get_by_id(report_id)
        if not report:
            raise ReportNotFoundError("日報が見つかりません")
        await self.repo.soft_delete(report, deleted_by=deleted_by)
