"""
工事案件リポジトリ（DB操作レイヤー）
"""
import uuid
from typing import Optional

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.project import Project
from app.schemas.project import ProjectCreate, ProjectUpdate


class ProjectRepository:

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_id(self, project_id: uuid.UUID) -> Optional[Project]:
        result = await self.db.execute(
            select(Project).where(Project.id == project_id, Project.deleted_at.is_(None))
        )
        return result.scalar_one_or_none()

    async def get_by_code(self, code: str) -> Optional[Project]:
        result = await self.db.execute(
            select(Project).where(Project.project_code == code, Project.deleted_at.is_(None))
        )
        return result.scalar_one_or_none()

    async def list(self, offset: int = 0, limit: int = 20, status: Optional[str] = None):
        q = select(Project).where(Project.deleted_at.is_(None))
        if status:
            q = q.where(Project.status == status)
        q = q.order_by(Project.created_at.desc()).offset(offset).limit(limit)
        result = await self.db.execute(q)
        return result.scalars().all()

    async def count(self, status: Optional[str] = None) -> int:
        q = select(func.count()).select_from(Project).where(Project.deleted_at.is_(None))
        if status:
            q = q.where(Project.status == status)
        result = await self.db.execute(q)
        return result.scalar_one()

    async def create(self, data: ProjectCreate, created_by: uuid.UUID) -> Project:
        project = Project(**data.model_dump(), created_by=created_by, updated_by=created_by)
        self.db.add(project)
        await self.db.flush()
        await self.db.refresh(project)
        return project

    async def update(self, project: Project, data: ProjectUpdate, updated_by: uuid.UUID) -> Project:
        for field, value in data.model_dump(exclude_none=True).items():
            setattr(project, field, value)
        project.updated_by = updated_by
        await self.db.flush()
        await self.db.refresh(project)
        return project

    async def soft_delete(self, project: Project, deleted_by: uuid.UUID) -> None:
        from datetime import datetime, timezone
        project.deleted_at = datetime.now(timezone.utc)
        project.updated_by = deleted_by
        await self.db.flush()
