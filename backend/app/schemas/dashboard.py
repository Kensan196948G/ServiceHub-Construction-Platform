"""ダッシュボード KPI スキーマ"""

from pydantic import BaseModel


class ProjectStats(BaseModel):
    total: int = 0
    planning: int = 0
    in_progress: int = 0
    on_hold: int = 0
    completed: int = 0


class IncidentStats(BaseModel):
    total: int = 0
    open: int = 0
    in_progress: int = 0
    resolved: int = 0


class CostOverview(BaseModel):
    total_budgeted: float = 0.0
    total_actual: float = 0.0
    variance: float = 0.0
    variance_rate: float = 0.0


class DashboardKPI(BaseModel):
    projects: ProjectStats
    incidents: IncidentStats
    cost_overview: CostOverview
    daily_reports_count: int = 0
    photos_count: int = 0
    users_count: int = 0
