"""
原価・工数リポジトリ（DB操作レイヤー）
"""

import uuid
from datetime import date, datetime, timezone
from decimal import Decimal
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.cost import CostRecord, WorkHour
from app.schemas.cost import CostRecordCreate, CostRecordUpdate, WorkHourCreate


class CostRecordRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_id(self, record_id: uuid.UUID) -> CostRecord | None:
        result = await self.db.execute(
            select(CostRecord).where(
                CostRecord.id == record_id, CostRecord.deleted_at.is_(None)
            )
        )
        return result.scalar_one_or_none()

    async def list(
        self,
        project_id: uuid.UUID,
        offset: int = 0,
        limit: int = 20,
        category: str | None = None,
    ):
        q = select(CostRecord).where(
            CostRecord.project_id == project_id, CostRecord.deleted_at.is_(None)
        )
        if category:
            q = q.where(CostRecord.category == category)
        q = q.order_by(CostRecord.record_date.desc()).offset(offset).limit(limit)
        result = await self.db.execute(q)
        return result.scalars().all()

    async def count(self, project_id: uuid.UUID, category: str | None = None) -> int:
        q = (
            select(func.count())
            .select_from(CostRecord)
            .where(
                CostRecord.project_id == project_id,
                CostRecord.deleted_at.is_(None),
            )
        )
        if category:
            q = q.where(CostRecord.category == category)
        result = await self.db.execute(q)
        return result.scalar_one()

    async def get_summary(self, project_id: uuid.UUID) -> dict[str, Decimal]:
        """プロジェクト別の予算合計・実績合計を返す"""
        result = await self.db.execute(
            select(
                func.coalesce(func.sum(CostRecord.budgeted_amount), 0).label(
                    "total_budget"
                ),
                func.coalesce(func.sum(CostRecord.actual_amount), 0).label(
                    "total_actual"
                ),
            )
            .select_from(CostRecord)
            .where(
                CostRecord.project_id == project_id,
                CostRecord.deleted_at.is_(None),
            )
        )
        row = result.one()
        return {
            "total_budget": row.total_budget,
            "total_actual": row.total_actual,
            "variance": row.total_budget - row.total_actual,
        }

    async def get_summary_by_category(self, project_id: uuid.UUID) -> Any:
        """カテゴリ別の予実集計を返す"""
        result = await self.db.execute(
            select(
                CostRecord.category,
                func.coalesce(func.sum(CostRecord.budgeted_amount), 0).label("budget"),
                func.coalesce(func.sum(CostRecord.actual_amount), 0).label("actual"),
                func.count().label("count"),
            )
            .where(
                CostRecord.project_id == project_id,
                CostRecord.deleted_at.is_(None),
            )
            .group_by(CostRecord.category)
        )
        return [
            {
                "category": row.category,
                "budget": row.budget,
                "actual": row.actual,
                "count": row.count,
            }
            for row in result.all()
        ]

    async def create(self, data: CostRecordCreate, created_by: uuid.UUID) -> CostRecord:
        record = CostRecord(**data.model_dump(), created_by=created_by)
        self.db.add(record)
        await self.db.flush()
        await self.db.refresh(record)
        return record

    async def update(self, record: CostRecord, data: CostRecordUpdate) -> CostRecord:
        for field, value in data.model_dump(exclude_none=True).items():
            setattr(record, field, value)
        await self.db.flush()
        await self.db.refresh(record)
        return record

    async def soft_delete(self, record: CostRecord) -> None:
        record.deleted_at = datetime.now(timezone.utc)
        await self.db.flush()


class WorkHourRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_id(self, hour_id: uuid.UUID) -> WorkHour | None:
        result = await self.db.execute(
            select(WorkHour).where(
                WorkHour.id == hour_id, WorkHour.deleted_at.is_(None)
            )
        )
        return result.scalar_one_or_none()

    async def list(
        self,
        project_id: uuid.UUID,
        offset: int = 0,
        limit: int = 20,
        work_date: date | None = None,
    ):
        q = select(WorkHour).where(
            WorkHour.project_id == project_id, WorkHour.deleted_at.is_(None)
        )
        if work_date:
            q = q.where(WorkHour.work_date == work_date)
        q = q.order_by(WorkHour.work_date.desc()).offset(offset).limit(limit)
        result = await self.db.execute(q)
        return result.scalars().all()

    async def count(self, project_id: uuid.UUID) -> int:
        result = await self.db.execute(
            select(func.count())
            .select_from(WorkHour)
            .where(
                WorkHour.project_id == project_id,
                WorkHour.deleted_at.is_(None),
            )
        )
        return result.scalar_one()

    async def get_total_hours(self, project_id: uuid.UUID) -> Decimal:
        """プロジェクトの総工数を返す"""
        result = await self.db.execute(
            select(func.coalesce(func.sum(WorkHour.hours), 0))
            .select_from(WorkHour)
            .where(
                WorkHour.project_id == project_id,
                WorkHour.deleted_at.is_(None),
            )
        )
        return result.scalar_one()

    async def create(self, data: WorkHourCreate, created_by: uuid.UUID) -> WorkHour:
        hour = WorkHour(**data.model_dump(), created_by=created_by)
        self.db.add(hour)
        await self.db.flush()
        await self.db.refresh(hour)
        return hour

    async def soft_delete(self, hour: WorkHour) -> None:
        hour.deleted_at = datetime.now(timezone.utc)
        await self.db.flush()
