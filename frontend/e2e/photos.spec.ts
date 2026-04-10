import { test, expect } from "@playwright/test";
import { loginAndNavigate, MOCK_PHOTOS, MOCK_PROJECTS } from "./fixtures/api-mocks";

/** Navigate to the photos page with projects and photos mocked. */
async function setupPhotosPage(page: import("@playwright/test").Page) {
  await loginAndNavigate(page);

  // Mock projects list (used by the project selector dropdown)
  await page.route("**/api/v1/projects**", (route) => {
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: MOCK_PROJECTS,
        meta: { page: 1, per_page: 100, total: 2 },
      }),
    });
  });

  // Mock photos list for project id "1"
  await page.route("**/api/v1/projects/1/photos**", (route) => {
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: MOCK_PHOTOS,
        meta: { total: 2, page: 1, per_page: 20, pages: 1 },
      }),
    });
  });

  // Navigate to photos page via sidebar
  await page.getByRole("link", { name: "写真管理" }).click();
  await page.waitForURL("**/photos");
}

test.describe("Photos Page", () => {
  test("displays page heading", async ({ page }) => {
    await setupPhotosPage(page);
    await expect(
      page.getByRole("heading", { name: /写真・資料管理/ })
    ).toBeVisible({ timeout: 10_000 });
  });

  test("shows project selector dropdown", async ({ page }) => {
    await setupPhotosPage(page);
    // Project selector should be visible for choosing a project
    const selector = page.locator("select").first();
    await expect(selector).toBeVisible({ timeout: 10_000 });
  });

  test("shows empty state when no project is selected", async ({ page }) => {
    await setupPhotosPage(page);
    // Before selecting a project, the empty state message should appear
    await expect(
      page.getByText("工事案件を選択してください")
    ).toBeVisible({ timeout: 10_000 });
  });

  test("loads photo list after selecting a project", async ({ page }) => {
    await setupPhotosPage(page);

    // Select the first project from the dropdown
    await page.locator("select").first().selectOption("1");

    // Photos should load — verify both mock photo descriptions appear
    await expect(page.getByText("2階部分の鉄骨組み立て完了")).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.getByText("安全帯着用確認")).toBeVisible();
  });

  test("shows category badge on each photo card", async ({ page }) => {
    await setupPhotosPage(page);
    await page.locator("select").first().selectOption("1");

    // PROGRESS and SAFETY category badges should appear
    await expect(page.getByText("工程")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("安全")).toBeVisible();
  });

  test("filters photos by category", async ({ page }) => {
    await setupPhotosPage(page);
    await page.locator("select").first().selectOption("1");

    // Wait for photos to load
    await expect(page.getByText("2階部分の鉄骨組み立て完了")).toBeVisible({
      timeout: 10_000,
    });

    // Click the SAFETY filter button (label includes count: "安全 (1)")
    await page.getByRole("button", { name: /^安全/ }).click();

    // Only the SAFETY photo should remain visible
    await expect(page.getByText("安全帯着用確認")).toBeVisible();
    // PROGRESS photo should be hidden after filtering
    await expect(page.getByText("2階部分の鉄骨組み立て完了")).not.toBeVisible();
  });

  test("shows all photos when ALL filter is selected", async ({ page }) => {
    await setupPhotosPage(page);
    await page.locator("select").first().selectOption("1");

    await expect(page.getByText("2階部分の鉄骨組み立て完了")).toBeVisible({
      timeout: 10_000,
    });

    // Apply SAFETY filter first, then reset to ALL
    await page.getByRole("button", { name: /^安全/ }).click();
    await expect(page.getByText("2階部分の鉄骨組み立て完了")).not.toBeVisible();

    // "すべて (2)" button resets the filter
    await page.getByRole("button", { name: /^すべて/ }).click();
    await expect(page.getByText("2階部分の鉄骨組み立て完了")).toBeVisible();
    await expect(page.getByText("安全帯着用確認")).toBeVisible();
  });

  test("shows empty list message when no photos exist for project", async ({
    page,
  }) => {
    await loginAndNavigate(page);

    // Override photos mock to return empty list
    await page.route("**/api/v1/projects**", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: MOCK_PROJECTS,
          meta: { page: 1, per_page: 100, total: 2 },
        }),
      });
    });
    await page.route("**/api/v1/projects/1/photos**", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: [],
          meta: { total: 0, page: 1, per_page: 20, pages: 0 },
        }),
      });
    });

    await page.getByRole("link", { name: "写真管理" }).click();
    await page.waitForURL("**/photos");
    await page.locator("select").first().selectOption("1");

    // Empty state message should appear
    await expect(page.getByText("写真・資料がありません")).toBeVisible({
      timeout: 10_000,
    });
  });

  test("shows error banner when photos API fails", async ({ page }) => {
    await loginAndNavigate(page);

    await page.route("**/api/v1/projects**", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: MOCK_PROJECTS,
          meta: { page: 1, per_page: 100, total: 2 },
        }),
      });
    });
    // Simulate API failure for photos endpoint
    await page.route("**/api/v1/projects/1/photos**", (route) => {
      route.fulfill({ status: 500, body: "Internal Server Error" });
    });

    await page.getByRole("link", { name: "写真管理" }).click();
    await page.waitForURL("**/photos");
    await page.locator("select").first().selectOption("1");

    // Error banner should appear with a meaningful message
    await expect(page.getByRole("alert")).toBeVisible({ timeout: 10_000 });
  });

  test("shows upload section with category and description fields", async ({
    page,
  }) => {
    await setupPhotosPage(page);
    await page.locator("select").first().selectOption("1");

    // Upload section heading
    await expect(page.getByText("📤 写真アップロード")).toBeVisible({
      timeout: 10_000,
    });
    // File select button
    await expect(
      page.getByRole("button", { name: "ファイル選択" })
    ).toBeVisible();
  });
});
