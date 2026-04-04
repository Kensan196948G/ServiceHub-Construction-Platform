import { useQuery, type UseQueryResult } from '@tanstack/react-query'
import api from './client'

export interface ProjectStats {
  total: number
  planning: number
  in_progress: number
  on_hold: number
  completed: number
}

export interface IncidentStats {
  total: number
  open: number
  in_progress: number
  resolved: number
}

export interface CostOverview {
  total_budgeted: number
  total_actual: number
  variance: number
  variance_rate: number
}

export interface DashboardKPI {
  projects: ProjectStats
  incidents: IncidentStats
  cost_overview: CostOverview
  daily_reports_count: number
  photos_count: number
  users_count: number
}

export async function fetchDashboardKPI(): Promise<DashboardKPI> {
  const res = await api.get<{ data: DashboardKPI }>('/dashboard/kpi')
  return res.data.data
}

export function useDashboardKPI(): UseQueryResult<DashboardKPI> {
  return useQuery({
    queryKey: ['dashboard', 'kpi'],
    queryFn: fetchDashboardKPI,
    staleTime: 30_000,
    retry: 2,
  })
}
