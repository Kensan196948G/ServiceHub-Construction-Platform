import { test, expect } from "@playwright/test";
import { loginAndNavigate } from './fixtures/api-mocks'

test.describe("Navigation", () => {
  test("root redirects to login when not authenticated", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/login/);
  });

  test("all protected routes redirect to login", async ({ page }) => {
    const protectedRoutes = [
      "/dashboard",
      "/projects",
      "/reports",
      "/safety",
      "/itsm",
      "/knowledge",
      "/cost",
      "/photos",
      "/users",
    ];

    for (const route of protectedRoutes) {
      await page.goto(route);
      await expect(page).toHaveURL(/\/login/, {
        timeout: 5_000,
      });
    }
  });

  test("login page has correct page title", async ({ page }) => {
    await page.goto("/login");
    await expect(page).toHaveTitle(/ServiceHub/);
  });
});

test.describe('Authenticated Navigation', () => {
  test('can access dashboard when authenticated', async ({ page }) => {
    await loginAndNavigate(page)
    await expect(page).toHaveURL(/\/dashboard/)
  })
})
