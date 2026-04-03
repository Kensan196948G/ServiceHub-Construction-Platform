"""
ダッシュボードサービス（KPI集約層）
各リポジトリから集計データを取得して統合
"""

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.cost import CostRecord
from app.models.daily_report import DailyReport
from app.models.itsm import Incident
from app.models.photo import Photo
from app.models.project import Project
from app.models.user import User
from app.schemas.dashboard import (
    CostOverview,
    DashboardKPI,
    IncidentStats,
    ProjectStats,
)


class DashboardService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_kpi(self) -> DashboardKPI:
        projects = await self._project_stats()
        incidents = await self._incident_stats()
        cost = await self._cost_overview()
        daily_reports_count = await self._count_active(DailyReport)
        photos_count = await self._count_active(Photo)
        users_count = await self._count_active(User)

        return DashboardKPI(
            projects=projects,
            incidents=incidents,
            cost_overview=cost,
            daily_reports_count=daily_reports_count,
            photos_count=photos_count,
            users_count=users_count,
        )

    async def _project_stats(self) -> ProjectStats:
        result = await self.db.execute(
            select(Project.status, func.count())
            .where(Project.deleted_at.is_(None))
            .group_by(Project.status)
        )
        counts: dict[str, int] = {}
        total = 0
        for status, count in result.all():
            counts[status] = count
            total += count

        return ProjectStats(
            total=total,
            planning=counts.get("PLANNING", 0),
            in_progress=counts.get("IN_PROGRESS", 0),
            on_hold=counts.get("ON_HOLD", 0),
            completed=counts.get("COMPLETED", 0),
        )

    async def _incident_stats(self) -> IncidentStats:
        result = await self.db.execute(
            select(Incident.status, func.count())
            .where(Incident.deleted_at.is_(None))
            .group_by(Incident.status)
        )
        counts: dict[str, int] = {}
        total = 0
        for status, count in result.all():
            counts[status] = count
            total += count

        return IncidentStats(
            total=total,
            open=counts.get("OPEN", 0),
            in_progress=counts.get("IN_PROGRESS", 0),
            resolved=counts.get("RESOLVED", 0),
        )

    async def _cost_overview(self) -> CostOverview:
        result = await self.db.execute(
            select(
                func.coalesce(func.sum(CostRecord.budgeted_amount), 0),
                func.coalesce(func.sum(CostRecord.actual_amount), 0),
            )
            .select_from(CostRecord)
            .where(CostRecord.deleted_at.is_(None))
        )
        row = result.one()
        budgeted = float(row[0])
        actual = float(row[1])
        variance = budgeted - actual
        rate = (variance / budgeted * 100) if budgeted else 0.0

        return CostOverview(
            total_budgeted=budgeted,
            total_actual=actual,
            variance=variance,
            variance_rate=round(rate, 2),
        )

    async def _count_active(self, model: type) -> int:
        result = await self.db.execute(
            select(func.count()).select_from(model).where(model.deleted_at.is_(None))  # type: ignore[attr-defined]
        )
        return result.scalar_one()
