import { test, expect } from '@playwright/test'
import { loginAndNavigate } from './fixtures/api-mocks'

test.describe('Projects', () => {
  test.beforeEach(async ({ page }) => {
    await loginAndNavigate(page)
    await page.goto('/projects')
    await page.waitForURL('**/projects')
  })

  test('shows project list', async ({ page }) => {
    await expect(page.getByText('渋谷オフィスビル新築工事')).toBeVisible({ timeout: 10_000 })
  })

  test('shows new project button', async ({ page }) => {
    await expect(
      page.getByRole('button', { name: /新規/ }).or(page.getByText(/新規/))
    ).toBeVisible({ timeout: 10_000 })
  })

  test('shows project status badge', async ({ page }) => {
    // IN_PROGRESS is displayed as "進行中"
    await expect(page.getByText('渋谷オフィスビル新築工事')).toBeVisible({ timeout: 10_000 })
  })
})
