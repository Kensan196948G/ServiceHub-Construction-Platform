"""
ITSMリポジトリ（DB操作レイヤー）
インシデント管理 / 変更要求管理
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.itsm import ChangeRequest, Incident
from app.schemas.itsm import (
    ChangeRequestCreate,
    ChangeRequestUpdate,
    IncidentCreate,
    IncidentUpdate,
)


class IncidentRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_id(self, incident_id: uuid.UUID) -> Incident | None:
        result = await self.db.execute(
            select(Incident).where(
                Incident.id == incident_id, Incident.deleted_at.is_(None)
            )
        )
        return result.scalar_one_or_none()

    async def get_by_number(self, number: str) -> Incident | None:
        result = await self.db.execute(
            select(Incident).where(
                Incident.incident_number == number,
                Incident.deleted_at.is_(None),
            )
        )
        return result.scalar_one_or_none()

    async def list(
        self,
        offset: int = 0,
        limit: int = 20,
        status: str | None = None,
        priority: str | None = None,
    ):
        q = select(Incident).where(Incident.deleted_at.is_(None))
        if status:
            q = q.where(Incident.status == status)
        if priority:
            q = q.where(Incident.priority == priority)
        q = q.order_by(Incident.created_at.desc()).offset(offset).limit(limit)
        result = await self.db.execute(q)
        return result.scalars().all()

    async def count(
        self,
        status: str | None = None,
        priority: str | None = None,
    ) -> int:
        q = (
            select(func.count())
            .select_from(Incident)
            .where(Incident.deleted_at.is_(None))
        )
        if status:
            q = q.where(Incident.status == status)
        if priority:
            q = q.where(Incident.priority == priority)
        result = await self.db.execute(q)
        return result.scalar_one()

    async def next_number(self) -> str:
        """次のインシデント番号を生成（INC-XXXXXX）"""
        result = await self.db.execute(
            select(func.count()).select_from(Incident)
        )
        total = result.scalar_one()
        return f"INC-{total + 1:06d}"

    async def create(
        self, data: IncidentCreate, created_by: uuid.UUID
    ) -> Incident:
        number = await self.next_number()
        incident = Incident(
            **data.model_dump(),
            incident_number=number,
            created_by=created_by,
            updated_by=created_by,
        )
        self.db.add(incident)
        await self.db.flush()
        await self.db.refresh(incident)
        return incident

    async def update(
        self, incident: Incident, data: IncidentUpdate, updated_by: uuid.UUID
    ) -> Incident:
        for field, value in data.model_dump(exclude_none=True).items():
            setattr(incident, field, value)
        incident.updated_by = updated_by
        await self.db.flush()
        await self.db.refresh(incident)
        return incident

    async def soft_delete(
        self, incident: Incident, deleted_by: uuid.UUID
    ) -> None:
        incident.deleted_at = datetime.now(timezone.utc)
        incident.updated_by = deleted_by
        await self.db.flush()


class ChangeRequestRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_id(
        self, cr_id: uuid.UUID
    ) -> ChangeRequest | None:
        result = await self.db.execute(
            select(ChangeRequest).where(
                ChangeRequest.id == cr_id,
                ChangeRequest.deleted_at.is_(None),
            )
        )
        return result.scalar_one_or_none()

    async def get_by_number(self, number: str) -> ChangeRequest | None:
        result = await self.db.execute(
            select(ChangeRequest).where(
                ChangeRequest.change_number == number,
                ChangeRequest.deleted_at.is_(None),
            )
        )
        return result.scalar_one_or_none()

    async def list(
        self,
        offset: int = 0,
        limit: int = 20,
        status: str | None = None,
        change_type: str | None = None,
    ):
        q = select(ChangeRequest).where(ChangeRequest.deleted_at.is_(None))
        if status:
            q = q.where(ChangeRequest.status == status)
        if change_type:
            q = q.where(ChangeRequest.change_type == change_type)
        q = q.order_by(ChangeRequest.created_at.desc()).offset(offset).limit(limit)
        result = await self.db.execute(q)
        return result.scalars().all()

    async def count(
        self,
        status: str | None = None,
        change_type: str | None = None,
    ) -> int:
        q = (
            select(func.count())
            .select_from(ChangeRequest)
            .where(ChangeRequest.deleted_at.is_(None))
        )
        if status:
            q = q.where(ChangeRequest.status == status)
        if change_type:
            q = q.where(ChangeRequest.change_type == change_type)
        result = await self.db.execute(q)
        return result.scalar_one()

    async def next_number(self) -> str:
        """次の変更要求番号を生成（CHG-XXXXXX）"""
        result = await self.db.execute(
            select(func.count()).select_from(ChangeRequest)
        )
        total = result.scalar_one()
        return f"CHG-{total + 1:06d}"

    async def create(
        self, data: ChangeRequestCreate, created_by: uuid.UUID
    ) -> ChangeRequest:
        number = await self.next_number()
        cr = ChangeRequest(
            **data.model_dump(),
            change_number=number,
            created_by=created_by,
            updated_by=created_by,
        )
        self.db.add(cr)
        await self.db.flush()
        await self.db.refresh(cr)
        return cr

    async def update(
        self, cr: ChangeRequest, data: ChangeRequestUpdate, updated_by: uuid.UUID
    ) -> ChangeRequest:
        for field, value in data.model_dump(exclude_none=True).items():
            setattr(cr, field, value)
        cr.updated_by = updated_by
        await self.db.flush()
        await self.db.refresh(cr)
        return cr

    async def soft_delete(
        self, cr: ChangeRequest, deleted_by: uuid.UUID
    ) -> None:
        cr.deleted_at = datetime.now(timezone.utc)
        cr.updated_by = deleted_by
        await self.db.flush()
