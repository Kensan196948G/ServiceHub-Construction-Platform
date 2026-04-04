import { test, expect } from "@playwright/test";
import { loginAndNavigate } from "./fixtures/api-mocks";

test.describe("Users Page", () => {
  test.beforeEach(async ({ page }) => {
    await loginAndNavigate(page);

    // Mock users API
    await page.route("**/api/v1/users**", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: [
            {
              id: "1",
              email: "admin@example.com",
              full_name: "管理者ユーザー",
              role: "ADMIN",
              is_active: true,
              created_at: "2026-01-01T00:00:00Z",
              updated_at: "2026-01-01T00:00:00Z",
            },
            {
              id: "2",
              email: "viewer@example.com",
              full_name: "閲覧者ユーザー",
              role: "VIEWER",
              is_active: true,
              created_at: "2026-02-01T00:00:00Z",
              updated_at: "2026-02-01T00:00:00Z",
            },
          ],
          meta: { page: 1, per_page: 20, total: 2 },
        }),
      });
    });

    await page.getByRole("link", { name: /ユーザー|Users/ }).click();
    await page.waitForURL("**/users");
  });

  test("displays users page heading", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: /ユーザー|Users/ })
    ).toBeVisible({ timeout: 10_000 });
  });

  test("shows user list", async ({ page }) => {
    await expect(page.getByText("管理者ユーザー")).toBeVisible({
      timeout: 10_000,
    });
  });

  test("shows user roles", async ({ page }) => {
    await expect(page.getByText("ADMIN")).toBeVisible({ timeout: 10_000 });
  });
});
