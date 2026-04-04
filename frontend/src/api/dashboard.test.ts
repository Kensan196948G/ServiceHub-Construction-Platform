import { describe, test, expect, vi, beforeEach } from 'vitest'
import api from './client'
import { fetchDashboardKPI } from './dashboard'

vi.mock('./client')

const mockKPI = {
  projects: { total: 10, planning: 2, in_progress: 5, on_hold: 1, completed: 2 },
  incidents: { total: 8, open: 3, in_progress: 2, resolved: 3 },
  cost_overview: {
    total_budgeted: 10_000_000,
    total_actual: 9_200_000,
    variance: -800_000,
    variance_rate: -0.08,
  },
  daily_reports_count: 24,
  photos_count: 156,
  users_count: 12,
}

describe('fetchDashboardKPI', () => {
  beforeEach(() => vi.clearAllMocks())

  test('calls GET /dashboard/kpi and returns data', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({ data: { data: mockKPI } })
    const result = await fetchDashboardKPI()
    expect(api.get).toHaveBeenCalledWith('/dashboard/kpi')
    expect(result).toEqual(mockKPI)
  })

  test('throws on API error', async () => {
    vi.mocked(api.get).mockRejectedValueOnce(new Error('Network error'))
    await expect(fetchDashboardKPI()).rejects.toThrow('Network error')
  })
})
