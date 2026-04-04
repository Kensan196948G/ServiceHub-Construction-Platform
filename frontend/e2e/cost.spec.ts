import { test, expect } from '@playwright/test'
import { loginAndNavigate } from './fixtures/api-mocks'

test.describe('Cost Records', () => {
  test.beforeEach(async ({ page }) => {
    await loginAndNavigate(page)
    await page.goto('/cost')
    await page.waitForURL('**/cost')
  })

  test('shows cost page', async ({ page }) => {
    // CostPage title is "原価管理"
    await expect(
      page.getByText(/原価管理/).first()
    ).toBeVisible({ timeout: 10_000 })
  })

  test('page loads without errors', async ({ page }) => {
    await page.waitForTimeout(2000)
    await expect(page.locator('body')).not.toContainText('Error')
  })
})
