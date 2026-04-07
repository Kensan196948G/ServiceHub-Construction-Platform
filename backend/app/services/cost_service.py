"""
原価管理サービス（ビジネスロジック層）
予実計算・コストサマリー生成
"""

import uuid
from decimal import Decimal

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundError
from app.repositories.cost import CostRecordRepository, WorkHourRepository
from app.schemas.cost import (
    CostRecordCreate,
    CostRecordResponse,
    CostSummary,
    WorkHourCreate,
    WorkHourResponse,
)


class CostService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.cost_repo = CostRecordRepository(db)
        self.hour_repo = WorkHourRepository(db)

    async def create_record(
        self, project_id: uuid.UUID, data: CostRecordCreate, created_by: uuid.UUID
    ) -> CostRecordResponse:
        data.project_id = project_id
        record = await self.cost_repo.create(data, created_by=created_by)
        return CostRecordResponse.model_validate(record)

    async def list_records(
        self, project_id: uuid.UUID, page: int, per_page: int
    ) -> tuple[list[CostRecordResponse], int]:
        offset = (page - 1) * per_page
        items = await self.cost_repo.list(project_id, offset=offset, limit=per_page)
        total = await self.cost_repo.count(project_id)
        return [CostRecordResponse.model_validate(i) for i in items], total

    async def get_summary(self, project_id: uuid.UUID) -> CostSummary:
        """予実対比サマリーを生成"""
        summary = await self.cost_repo.get_summary(project_id)
        by_category = await self.cost_repo.get_summary_by_category(project_id)

        total_budgeted = summary["total_budget"]
        total_actual = summary["total_actual"]
        variance = summary["variance"]
        variance_rate = (
            float(variance / total_budgeted * 100) if total_budgeted else 0.0
        )

        return CostSummary(
            project_id=project_id,
            total_budgeted=Decimal(str(total_budgeted)),
            total_actual=Decimal(str(total_actual)),
            variance=Decimal(str(variance)),
            variance_rate=round(variance_rate, 2),
            by_category={
                item["category"]: {
                    "budgeted": float(item["budget"]),
                    "actual": float(item["actual"]),
                }
                for item in by_category
            },
        )

    async def create_work_hour(
        self, project_id: uuid.UUID, data: WorkHourCreate, created_by: uuid.UUID
    ) -> WorkHourResponse:
        data.project_id = project_id
        wh = await self.hour_repo.create(data, created_by=created_by)
        return WorkHourResponse.model_validate(wh)

    async def delete_record(self, project_id: uuid.UUID, record_id: uuid.UUID) -> None:
        record = await self.cost_repo.get_by_id(record_id)
        if not record or record.project_id != project_id:
            raise CostNotFoundError("原価記録が見つかりません")
        await self.cost_repo.soft_delete(record)


class CostNotFoundError(NotFoundError):
    detail = "原価記録が見つかりません"
