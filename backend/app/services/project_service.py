"""
工事案件サービス（ビジネスロジック層）
案件の作成・一覧・取得・更新・削除
"""

import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ConflictError, NotFoundError
from app.repositories.project import ProjectRepository
from app.schemas.project import ProjectCreate, ProjectResponse, ProjectUpdate


class ProjectNotFoundError(NotFoundError):
    detail = "案件が見つかりません"


class DuplicateProjectCodeError(ConflictError):
    detail = "案件コードが重複しています"


class ProjectService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = ProjectRepository(db)

    async def create_project(
        self, data: ProjectCreate, created_by: uuid.UUID
    ) -> ProjectResponse:
        existing = await self.repo.get_by_code(data.project_code)
        if existing:
            raise DuplicateProjectCodeError("案件コードが既に存在します")
        project = await self.repo.create(data, created_by=created_by)
        return ProjectResponse.model_validate(project)

    async def list_projects(
        self, page: int, per_page: int, status: str | None = None
    ) -> tuple[list[ProjectResponse], int]:
        offset = (page - 1) * per_page
        items = await self.repo.list(offset=offset, limit=per_page, status=status)
        total = await self.repo.count(status=status)
        return [ProjectResponse.model_validate(p) for p in items], total

    async def get_project(self, project_id: uuid.UUID) -> ProjectResponse:
        project = await self.repo.get_by_id(project_id)
        if not project:
            raise ProjectNotFoundError("案件が見つかりません")
        return ProjectResponse.model_validate(project)

    async def update_project(
        self, project_id: uuid.UUID, data: ProjectUpdate, updated_by: uuid.UUID
    ) -> ProjectResponse:
        project = await self.repo.get_by_id(project_id)
        if not project:
            raise ProjectNotFoundError("案件が見つかりません")
        project = await self.repo.update(project, data, updated_by=updated_by)
        return ProjectResponse.model_validate(project)

    async def delete_project(
        self, project_id: uuid.UUID, deleted_by: uuid.UUID
    ) -> None:
        project = await self.repo.get_by_id(project_id)
        if not project:
            raise ProjectNotFoundError("案件が見つかりません")
        await self.repo.soft_delete(project, deleted_by=deleted_by)
