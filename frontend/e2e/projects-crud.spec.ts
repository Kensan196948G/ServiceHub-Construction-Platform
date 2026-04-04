import { test, expect } from "@playwright/test";
import { loginAndNavigate, MOCK_PROJECTS } from "./fixtures/api-mocks";

test.describe("Projects CRUD", () => {
  test.beforeEach(async ({ page }) => {
    await loginAndNavigate(page);
    await page.getByRole("link", { name: "工事案件" }).click();
    await page.waitForURL("**/projects");
  });

  test("opens create project modal and fills form", async ({ page }) => {
    // Mock POST for project creation
    await page.route("**/api/v1/projects", (route) => {
      if (route.request().method() === "POST") {
        route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            data: {
              id: "new-1",
              project_code: "PRJ-NEW",
              name: "新規テスト工事",
              status: "PLANNING",
              client_name: "テスト株式会社",
              budget: 10000000,
              start_date: "2026-05-01",
              end_date: null,
              description: "E2E テスト用プロジェクト",
              site_address: null,
              manager_id: null,
              created_at: "2026-04-05T00:00:00Z",
              updated_at: "2026-04-05T00:00:00Z",
            },
          }),
        });
      } else {
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            data: MOCK_PROJECTS,
            meta: { page: 1, per_page: 20, total: 2 },
          }),
        });
      }
    });

    // Click new project button
    await page.getByRole("button", { name: /新規/ }).click();

    // Modal should open with title
    await expect(
      page.getByRole("heading", { name: /新規工事案件/ })
    ).toBeVisible({ timeout: 5_000 });

    // Fill form fields
    await page.getByLabel(/案件名/).fill("新規テスト工事");
    await page.getByLabel(/施主名/).fill("テスト株式会社");

    // Verify form fields are filled
    await expect(page.getByLabel(/案件名/)).toHaveValue("新規テスト工事");
    await expect(page.getByLabel(/施主名/)).toHaveValue("テスト株式会社");
  });

  test("navigates to project detail page", async ({ page }) => {
    // Mock project detail API
    await page.route("**/api/v1/projects/1", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: MOCK_PROJECTS[0],
        }),
      });
    });

    // Click on project name
    await page.getByText("渋谷オフィスビル新築工事").click();
    await page.waitForURL("**/projects/1");

    // Should show project detail
    await expect(
      page.getByText("渋谷オフィスビル新築工事")
    ).toBeVisible({ timeout: 10_000 });
  });

  test("shows project count in list", async ({ page }) => {
    // Verify both projects are visible
    await expect(page.getByText("渋谷オフィスビル新築工事")).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.getByText("横浜マンション改修工事")).toBeVisible({
      timeout: 10_000,
    });
  });
});
