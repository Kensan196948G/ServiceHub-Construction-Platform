import { test, expect } from "@playwright/test";
import { loginAndNavigate, MOCK_PROJECTS } from "./fixtures/api-mocks";

test.describe("Projects CRUD", () => {
  test.beforeEach(async ({ page }) => {
    await loginAndNavigate(page);
    await page.goto("/projects");
    await page.waitForURL("**/projects");
  });

  // ─── 既存テスト ────────────────────────────────────────────────

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

  test("project link navigates to detail page", async ({ page }) => {
    // Verify project name is a clickable link to detail page
    const link = page.getByRole("link", { name: "渋谷オフィスビル新築工事" });
    await expect(link).toBeVisible({ timeout: 10_000 });
    await expect(link).toHaveAttribute("href", /\/projects\/1/);
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

  // ─── 新規追加テスト ───────────────────────────────────────────

  test("search filter shows matching projects", async ({ page }) => {
    // Wait for projects to load
    await expect(page.getByText("渋谷オフィスビル新築工事")).toBeVisible({
      timeout: 10_000,
    });

    // Type search query matching only the first project
    await page.getByPlaceholder("案件名・コード・施主で検索...").fill("渋谷");

    // First project should remain visible
    await expect(page.getByText("渋谷オフィスビル新築工事")).toBeVisible();
    // Second project should be filtered out
    await expect(page.getByText("横浜マンション改修工事")).not.toBeVisible();
  });

  test("search filter by project code", async ({ page }) => {
    await expect(page.getByText("渋谷オフィスビル新築工事")).toBeVisible({
      timeout: 10_000,
    });

    // Filter by project code of the second project
    await page.getByPlaceholder("案件名・コード・施主で検索...").fill("PRJ-002");

    await expect(page.getByText("横浜マンション改修工事")).toBeVisible();
    await expect(page.getByText("渋谷オフィスビル新築工事")).not.toBeVisible();
  });

  test("search filter shows empty state when no match", async ({ page }) => {
    await expect(page.getByText("渋谷オフィスビル新築工事")).toBeVisible({
      timeout: 10_000,
    });

    // Search for a non-existent project
    await page.getByPlaceholder("案件名・コード・施主で検索...").fill("存在しない工事XYZ");

    // Both projects should disappear, empty state message should appear
    await expect(page.getByText("案件がありません")).toBeVisible();
  });

  test("cancel button closes create modal", async ({ page }) => {
    // Open modal
    await page.getByRole("button", { name: /新規/ }).click();
    await expect(
      page.getByRole("heading", { name: /新規工事案件/ })
    ).toBeVisible({ timeout: 5_000 });

    // Click cancel
    await page.getByRole("button", { name: "キャンセル" }).click();

    // Modal should close
    await expect(
      page.getByRole("heading", { name: /新規工事案件/ })
    ).not.toBeVisible();
  });

  test("creates project successfully and closes modal", async ({ page }) => {
    // Setup: mock the POST to return success, then the list refresh
    const newProject = {
      id: "new-1",
      project_code: "PRJ-TEST",
      name: "E2Eテスト工事",
      status: "PLANNING",
      client_name: "テスト施主株式会社",
      budget: null,
      start_date: null,
      end_date: null,
      description: null,
      site_address: null,
      manager_id: null,
      created_at: "2026-04-09T00:00:00Z",
      updated_at: "2026-04-09T00:00:00Z",
    };

    await page.route("**/api/v1/projects", (route) => {
      if (route.request().method() === "POST") {
        route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify({ success: true, data: newProject }),
        });
      } else {
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            data: [...MOCK_PROJECTS, newProject],
            meta: { page: 1, per_page: 20, total: 3 },
          }),
        });
      }
    });

    // Open modal
    await page.getByRole("button", { name: /新規/ }).click();
    await expect(
      page.getByRole("heading", { name: /新規工事案件/ })
    ).toBeVisible({ timeout: 5_000 });

    // Fill all required fields
    await page.locator("#project_code").fill("PRJ-TEST");
    await page.locator("#name").fill("E2Eテスト工事");
    await page.locator("#client_name").fill("テスト施主株式会社");

    // Submit form
    await page.getByRole("button", { name: "作成" }).click();

    // Modal should close on success
    await expect(
      page.getByRole("heading", { name: /新規工事案件/ })
    ).not.toBeVisible({ timeout: 5_000 });
  });

  test("shows total project count", async ({ page }) => {
    // Wait for the data to load and verify the count display
    await expect(page.getByText("渋谷オフィスビル新築工事")).toBeVisible({
      timeout: 10_000,
    });

    // MOCK_PROJECTS has 2 items, total=2 in mock
    await expect(page.getByText(/全.*2.*件/)).toBeVisible();
  });

  test("shows status badges for each project", async ({ page }) => {
    await expect(page.getByText("渋谷オフィスビル新築工事")).toBeVisible({
      timeout: 10_000,
    });

    // PRJ-001 is IN_PROGRESS → "進行中"
    await expect(page.getByText("進行中")).toBeVisible();
    // PRJ-002 is PLANNING → "計画中"
    await expect(page.getByText("計画中")).toBeVisible();
  });
});
