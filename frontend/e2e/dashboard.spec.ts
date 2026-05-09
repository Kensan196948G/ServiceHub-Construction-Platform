import { test, expect } from '@playwright/test'
import { loginAndNavigate, MOCK_KPI } from './fixtures/api-mocks'

// E2E for the Dashboard route introduced in PR #199 (Dashboard v2).
// Covers stat cards, KPI error banner, the three Dashboard v2 surfaces added in PR #203
// (greeting h2 / 原価予実対比 SVG / 現場クイックアクション h3), and the three remaining
// Dashboard v2 h3 sections added in this PR: 進捗率 — 主要案件, 最近の工事案件, 注意インシデント.
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
    // Scope search to the stat card container to avoid collision with the date header
    // (e.g. "2026年4月10日" also contains "10" which would cause a strict mode violation)
    const projectStatCard = page.getByText('工事案件数 (合計)').locator('..')
    await expect(projectStatCard.getByText(String(MOCK_KPI.projects.total))).toBeVisible({ timeout: 10_000 })
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
    await expect(
      page.getByRole('heading', { level: 3, name: '現場クイックアクション' })
    ).toBeVisible()
  })

  test('shows time-of-day greeting with user name', async ({ page }) => {
    await expect(
      page.getByRole('heading', { level: 2, name: /(おはようございます|こんにちは|お疲れ様です)、.+さん$/ })
    ).toBeVisible({ timeout: 10_000 })
  })

  test('renders 原価予実対比 SVG chart with accessible name', async ({ page }) => {
    await expect(
      page.getByRole('img', { name: '原価予実対比チャート' })
    ).toBeVisible({ timeout: 10_000 })
  })

  test('shows 進捗率 — 主要案件 progress chart heading', async ({ page }) => {
    // The em dash (U+2014) in the heading must be matched literally; a hyphen-minus will not match.
    await expect(
      page.getByRole('heading', { level: 3, name: '進捗率 — 主要案件' })
    ).toBeVisible({ timeout: 10_000 })
  })

  test('shows 最近の工事案件 recent projects table heading', async ({ page }) => {
    await expect(
      page.getByRole('heading', { level: 3, name: '最近の工事案件' })
    ).toBeVisible({ timeout: 10_000 })
  })

  test('shows 注意インシデント recent incidents heading', async ({ page }) => {
    await expect(
      page.getByRole('heading', { level: 3, name: '注意インシデント' })
    ).toBeVisible({ timeout: 10_000 })
  })
})
