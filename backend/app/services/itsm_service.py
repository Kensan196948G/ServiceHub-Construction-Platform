"""
ITSM運用管理サービス（ビジネスロジック層）
インシデント管理・変更要求管理（ISO20000準拠）
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy.ext.asyncio import AsyncSession

from app.repositories.itsm import ChangeRequestRepository, IncidentRepository
from app.schemas.itsm import (
    ChangeRequestCreate,
    ChangeRequestResponse,
    IncidentCreate,
    IncidentResponse,
    IncidentUpdate,
)


class IncidentNotFoundError(Exception):
    """インシデントが見つからない"""


class ChangeRequestNotFoundError(Exception):
    """変更要求が見つからない"""


class InvalidStatusError(Exception):
    """無効なステータス遷移"""


class ITSMService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.incident_repo = IncidentRepository(db)
        self.change_repo = ChangeRequestRepository(db)

    # ---------- Incident ----------

    async def create_incident(
        self, data: IncidentCreate, created_by: uuid.UUID
    ) -> IncidentResponse:
        """インシデント起票"""
        incident = await self.incident_repo.create(data, created_by=created_by)
        return IncidentResponse.model_validate(incident)

    async def list_incidents(
        self,
        page: int,
        per_page: int,
        status: str | None = None,
        priority: str | None = None,
    ) -> tuple[list[IncidentResponse], int]:
        """インシデント一覧（ページネーション付き）"""
        offset = (page - 1) * per_page
        total = await self.incident_repo.count(status=status, priority=priority)
        items = await self.incident_repo.list(
            offset=offset, limit=per_page, status=status, priority=priority
        )
        return [IncidentResponse.model_validate(i) for i in items], total

    async def get_incident(self, incident_id: uuid.UUID) -> IncidentResponse:
        """インシデント取得"""
        incident = await self.incident_repo.get_by_id(incident_id)
        if not incident:
            raise IncidentNotFoundError("インシデントが見つかりません")
        return IncidentResponse.model_validate(incident)

    async def update_incident(
        self,
        incident_id: uuid.UUID,
        data: IncidentUpdate,
        updated_by: uuid.UUID,
    ) -> IncidentResponse:
        """インシデント更新・解決"""
        incident = await self.incident_repo.get_by_id(incident_id)
        if not incident:
            raise IncidentNotFoundError("インシデントが見つかりません")

        # RESOLVED ステータス設定時に resolved_at を自動セット
        if data.status == "RESOLVED" and incident.resolved_at is None:
            incident.resolved_at = datetime.now(timezone.utc)

        incident = await self.incident_repo.update(
            incident, data, updated_by=updated_by
        )
        return IncidentResponse.model_validate(incident)

    # ---------- Change Request ----------

    async def create_change(
        self, data: ChangeRequestCreate, created_by: uuid.UUID
    ) -> ChangeRequestResponse:
        """変更要求起票"""
        change = await self.change_repo.create(data, created_by=created_by)
        return ChangeRequestResponse.model_validate(change)

    async def list_changes(
        self,
        page: int,
        per_page: int,
        status: str | None = None,
        change_type: str | None = None,
    ) -> tuple[list[ChangeRequestResponse], int]:
        """変更要求一覧（ページネーション付き）"""
        offset = (page - 1) * per_page
        total = await self.change_repo.count(status=status, change_type=change_type)
        items = await self.change_repo.list(
            offset=offset, limit=per_page, status=status, change_type=change_type
        )
        return [ChangeRequestResponse.model_validate(i) for i in items], total

    async def approve_change(
        self, change_id: uuid.UUID, approved_by: uuid.UUID
    ) -> ChangeRequestResponse:
        """変更承認（SoD: ADMINのみ承認可）"""
        change = await self.change_repo.get_by_id(change_id)
        if not change:
            raise ChangeRequestNotFoundError("変更要求が見つかりません")
        if change.status not in ("DRAFT", "REVIEW"):
            raise InvalidStatusError(f"ステータス{change.status}は承認できません")

        change.status = "APPROVED"
        change.approved_by = approved_by
        change.approved_at = datetime.now(timezone.utc)
        change.updated_by = approved_by
        await self.db.flush()
        await self.db.refresh(change)
        return ChangeRequestResponse.model_validate(change)
