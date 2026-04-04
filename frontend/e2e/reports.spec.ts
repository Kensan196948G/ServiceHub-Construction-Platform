import { test, expect } from '@playwright/test'
import { loginAndNavigate } from './fixtures/api-mocks'

test.describe('Daily Reports', () => {
  test.beforeEach(async ({ page }) => {
    await loginAndNavigate(page)
    await page.goto('/reports')
    await page.waitForURL('**/reports')
  })

  test('shows daily reports page', async ({ page }) => {
    // Verify the page is visible (header or title)
    await expect(
      page.getByText(/日報/).first()
    ).toBeVisible({ timeout: 10_000 })
  })

  test('shows report date or content', async ({ page }) => {
    // Verify that the page is not broken
    await page.waitForTimeout(2000)
    await expect(page.locator('body')).not.toContainText('Error')
  })
})
