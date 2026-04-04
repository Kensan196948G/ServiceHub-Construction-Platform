import { test, expect } from '@playwright/test'
import { loginAndNavigate, MOCK_KPI } from './fixtures/api-mocks'

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await loginAndNavigate(page)
  })

  test('shows 4 KPI stat cards', async ({ page }) => {
    await expect(page.getByText('工事案件数 (合計)')).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText('進行中インシデント')).toBeVisible()
    await expect(page.getByText('コスト達成率')).toBeVisible()
    await expect(page.getByText('本日の日報件数')).toBeVisible()
  })

  test('shows correct project total from KPI', async ({ page }) => {
    await expect(page.getByText(String(MOCK_KPI.projects.total))).toBeVisible({ timeout: 10_000 })
  })

  test('shows error banner when KPI API fails', async ({ page }) => {
    // Override KPI mock to return 500
    await page.route('**/api/v1/dashboard/kpi', (route) => {
      route.fulfill({ status: 500, body: 'Internal Server Error' })
    })
    await page.reload()
    await expect(page.getByText('KPI データの取得に失敗しました')).toBeVisible({ timeout: 10_000 })
    await expect(page.getByRole('button', { name: '再試行' })).toBeVisible()
  })

  test('shows quick actions', async ({ page }) => {
    await expect(page.getByText('クイックアクション')).toBeVisible()
  })
})
