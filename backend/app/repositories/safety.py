"""
安全・品質管理リポジトリ（DB操作レイヤー）
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.safety import QualityInspection, SafetyCheck
from app.schemas.safety import (
    QualityInspectionCreate,
    QualityInspectionUpdate,
    SafetyCheckCreate,
    SafetyCheckUpdate,
)


class SafetyCheckRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_id(self, check_id: uuid.UUID) -> SafetyCheck | None:
        result = await self.db.execute(
            select(SafetyCheck).where(
                SafetyCheck.id == check_id, SafetyCheck.deleted_at.is_(None)
            )
        )
        return result.scalar_one_or_none()

    async def list(
        self,
        project_id: uuid.UUID,
        offset: int = 0,
        limit: int = 20,
        check_type: str | None = None,
    ):
        q = select(SafetyCheck).where(
            SafetyCheck.project_id == project_id,
            SafetyCheck.deleted_at.is_(None),
        )
        if check_type:
            q = q.where(SafetyCheck.check_type == check_type)
        q = q.order_by(SafetyCheck.check_date.desc()).offset(offset).limit(limit)
        result = await self.db.execute(q)
        return result.scalars().all()

    async def count(self, project_id: uuid.UUID, check_type: str | None = None) -> int:
        q = (
            select(func.count())
            .select_from(SafetyCheck)
            .where(
                SafetyCheck.project_id == project_id,
                SafetyCheck.deleted_at.is_(None),
            )
        )
        if check_type:
            q = q.where(SafetyCheck.check_type == check_type)
        result = await self.db.execute(q)
        return result.scalar_one()

    async def create(
        self, data: SafetyCheckCreate, created_by: uuid.UUID
    ) -> SafetyCheck:
        check = SafetyCheck(**data.model_dump(), created_by=created_by)
        self.db.add(check)
        await self.db.flush()
        await self.db.refresh(check)
        return check

    async def update(self, check: SafetyCheck, data: SafetyCheckUpdate) -> SafetyCheck:
        for field, value in data.model_dump(exclude_none=True).items():
            setattr(check, field, value)
        await self.db.flush()
        await self.db.refresh(check)
        return check

    async def soft_delete(self, check: SafetyCheck) -> None:
        check.deleted_at = datetime.now(timezone.utc)
        await self.db.flush()


class QualityInspectionRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_id(self, inspection_id: uuid.UUID) -> QualityInspection | None:
        result = await self.db.execute(
            select(QualityInspection).where(
                QualityInspection.id == inspection_id,
                QualityInspection.deleted_at.is_(None),
            )
        )
        return result.scalar_one_or_none()

    async def list(
        self,
        project_id: uuid.UUID,
        offset: int = 0,
        limit: int = 20,
        result_filter: str | None = None,
    ):
        q = select(QualityInspection).where(
            QualityInspection.project_id == project_id,
            QualityInspection.deleted_at.is_(None),
        )
        if result_filter:
            q = q.where(QualityInspection.result == result_filter)
        q = (
            q.order_by(QualityInspection.inspection_date.desc())
            .offset(offset)
            .limit(limit)
        )
        result = await self.db.execute(q)
        return result.scalars().all()

    async def count(
        self, project_id: uuid.UUID, result_filter: str | None = None
    ) -> int:
        q = (
            select(func.count())
            .select_from(QualityInspection)
            .where(
                QualityInspection.project_id == project_id,
                QualityInspection.deleted_at.is_(None),
            )
        )
        if result_filter:
            q = q.where(QualityInspection.result == result_filter)
        result = await self.db.execute(q)
        return result.scalar_one()

    async def create(
        self, data: QualityInspectionCreate, created_by: uuid.UUID
    ) -> QualityInspection:
        inspection = QualityInspection(**data.model_dump(), created_by=created_by)
        self.db.add(inspection)
        await self.db.flush()
        await self.db.refresh(inspection)
        return inspection

    async def update(
        self, inspection: QualityInspection, data: QualityInspectionUpdate
    ) -> QualityInspection:
        for field, value in data.model_dump(exclude_none=True).items():
            setattr(inspection, field, value)
        await self.db.flush()
        await self.db.refresh(inspection)
        return inspection

    async def soft_delete(self, inspection: QualityInspection) -> None:
        inspection.deleted_at = datetime.now(timezone.utc)
        await self.db.flush()
