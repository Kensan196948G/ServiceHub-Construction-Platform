import { test, expect } from '@playwright/test'
import { loginAndNavigate } from './fixtures/api-mocks'

test.describe('Safety Inspections', () => {
  test.beforeEach(async ({ page }) => {
    await loginAndNavigate(page)
    await page.goto('/safety')
    await page.waitForURL('**/safety')
  })

  test('shows safety inspections page', async ({ page }) => {
    await expect(
      page.getByText(/安全/).first()
    ).toBeVisible({ timeout: 10_000 })
  })

  test('page loads without errors', async ({ page }) => {
    await expect(page.getByText(/安全/).first()).toBeVisible({ timeout: 10_000 })
    await expect(page.locator('body')).not.toContainText('Error')
  })
})
