"""
安全・品質管理サービス（ビジネスロジック層）
"""

import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.repositories.safety import QualityInspectionRepository, SafetyCheckRepository
from app.schemas.safety import (
    QualityInspectionCreate,
    QualityInspectionResponse,
    SafetyCheckCreate,
    SafetyCheckResponse,
)


class SafetyService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.check_repo = SafetyCheckRepository(db)
        self.inspection_repo = QualityInspectionRepository(db)

    async def create_safety_check(
        self,
        project_id: uuid.UUID,
        data: SafetyCheckCreate,
        created_by: uuid.UUID,
    ) -> SafetyCheckResponse:
        data.project_id = project_id
        check = await self.check_repo.create(data, created_by=created_by)
        return SafetyCheckResponse.model_validate(check)

    async def list_safety_checks(
        self, project_id: uuid.UUID, page: int, per_page: int
    ) -> tuple[list[SafetyCheckResponse], int]:
        offset = (page - 1) * per_page
        items = await self.check_repo.list(project_id, offset=offset, limit=per_page)
        total = await self.check_repo.count(project_id)
        return [SafetyCheckResponse.model_validate(i) for i in items], total

    async def delete_safety_check(
        self, project_id: uuid.UUID, check_id: uuid.UUID
    ) -> None:
        check = await self.check_repo.get_by_id(check_id)
        if not check or check.project_id != project_id:
            raise SafetyCheckNotFoundError("安全チェックが見つかりません")
        await self.check_repo.soft_delete(check)

    async def create_quality_inspection(
        self,
        project_id: uuid.UUID,
        data: QualityInspectionCreate,
        created_by: uuid.UUID,
    ) -> QualityInspectionResponse:
        data.project_id = project_id
        insp = await self.inspection_repo.create(data, created_by=created_by)
        return QualityInspectionResponse.model_validate(insp)

    async def list_quality_inspections(
        self, project_id: uuid.UUID, page: int, per_page: int
    ) -> tuple[list[QualityInspectionResponse], int]:
        offset = (page - 1) * per_page
        items = await self.inspection_repo.list(
            project_id, offset=offset, limit=per_page
        )
        total = await self.inspection_repo.count(project_id)
        return [QualityInspectionResponse.model_validate(i) for i in items], total

    async def delete_quality_inspection(
        self, project_id: uuid.UUID, inspection_id: uuid.UUID
    ) -> None:
        insp = await self.inspection_repo.get_by_id(inspection_id)
        if not insp or insp.project_id != project_id:
            raise QualityInspectionNotFoundError("品質検査が見つかりません")
        await self.inspection_repo.soft_delete(insp)


class SafetyCheckNotFoundError(Exception):
    """安全チェックが見つからない"""


class QualityInspectionNotFoundError(Exception):
    """品質検査が見つからない"""
