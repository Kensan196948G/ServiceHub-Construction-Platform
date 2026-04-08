import { useQuery, type UseQueryResult } from '@tanstack/react-query'
import api from './client'
import type {
  ProjectStats,
  IncidentStats,
  CostOverview,
  DashboardKPI,
} from '@/generated'

// Re-export generated types for downstream consumers
export type { ProjectStats, IncidentStats, CostOverview, DashboardKPI }

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
