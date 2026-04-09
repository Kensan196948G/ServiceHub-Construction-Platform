import { test, expect } from "@playwright/test";
import { loginAndNavigate, MOCK_PROJECTS } from "./fixtures/api-mocks";

const MOCK_PROJECT = MOCK_PROJECTS[0]; // 渋谷オフィスビル新築工事 (id=1)

test.describe("Project Detail Page", () => {
  test.beforeEach(async ({ page }) => {
    await loginAndNavigate(page);

    // Mock individual project endpoint (more specific than list mock in setupAllApiMocks)
    await page.route("**/api/v1/projects/1", (route) => {
      if (route.request().method() === "GET") {
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ success: true, data: MOCK_PROJECT }),
        });
      } else {
        route.continue();
      }
    });

    // Mock cost-records endpoint for CostTab
    await page.route("**/api/v1/projects/1/cost-records**", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: [],
          meta: { page: 1, per_page: 20, total: 0 },
        }),
      });
    });

    // Mock cost-summary endpoint for CostTab
    await page.route("**/api/v1/projects/1/cost-summary**", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: {
            total_budgeted: 0,
            total_actual: 0,
            variance: 0,
            variance_rate: 0,
          },
        }),
      });
    });

    await page.goto("/projects/1");
    await page.waitForURL("**/projects/1");
    // Wait for project name to appear in heading
    await expect(page.getByRole("heading", { name: "渋谷オフィスビル新築工事" })).toBeVisible({
      timeout: 10_000,
    });
  });

  // ─── Display ──────────────────────────────────────

  test("shows project name and code in header", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "渋谷オフィスビル新築工事" })).toBeVisible();
    await expect(page.getByRole("paragraph").filter({ hasText: "PRJ-001" })).toBeVisible();
  });

  test("shows back link to projects list", async ({ page }) => {
    const backLink = page.locator('a[href="/projects"]');
    await expect(backLink).toBeVisible();
  });

  test("InfoTab is active by default", async ({ page }) => {
    // 基本情報 tab should be active (has border-primary class)
    const infoTab = page.getByRole("button", { name: /基本情報/ });
    await expect(infoTab).toBeVisible();
    await expect(infoTab).toHaveClass(/border-primary/);
  });

  test("shows project fields in view mode", async ({ page }) => {
    // InfoTab shows project data
    await expect(page.getByText("株式会社テスト")).toBeVisible();
    await expect(page.getByText("PRJ-001").first()).toBeVisible();
  });

  // ─── InfoTab Edit ─────────────────────────────────

  test("clicking edit button switches to edit mode", async ({ page }) => {
    await page.getByRole("button", { name: "編集" }).click();

    // Edit form fields should appear
    await expect(page.locator("#edit-name")).toBeVisible({ timeout: 5_000 });
    await expect(page.locator("#edit-project_code")).toBeVisible();
    await expect(page.locator("#edit-client_name")).toBeVisible();
  });

  test("edit form is pre-filled with current project data", async ({ page }) => {
    await page.getByRole("button", { name: "編集" }).click();
    await expect(page.locator("#edit-name")).toBeVisible({ timeout: 5_000 });

    await expect(page.locator("#edit-name")).toHaveValue("渋谷オフィスビル新築工事");
    await expect(page.locator("#edit-project_code")).toHaveValue("PRJ-001");
    await expect(page.locator("#edit-client_name")).toHaveValue("株式会社テスト");
  });

  test("cancel button exits edit mode without saving", async ({ page }) => {
    await page.getByRole("button", { name: "編集" }).click();
    await expect(page.locator("#edit-name")).toBeVisible({ timeout: 5_000 });

    // Change a field (should be discarded)
    await page.locator("#edit-name").fill("変更後の名前");

    await page.getByRole("button", { name: "キャンセル" }).click();

    // Edit form should be gone, original name should be shown
    await expect(page.locator("#edit-name")).not.toBeVisible();
    await expect(page.getByRole("heading", { name: "渋谷オフィスビル新築工事" })).toBeVisible();
  });

  test("save sends PATCH and exits edit mode", async ({ page }) => {
    const updatedProject = { ...MOCK_PROJECT, name: "渋谷ビル改修工事" };

    // Mock PATCH endpoint
    await page.route("**/api/v1/projects/1", (route) => {
      if (route.request().method() === "PATCH" || route.request().method() === "PUT") {
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ success: true, data: updatedProject }),
        });
      } else if (route.request().method() === "GET") {
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ success: true, data: updatedProject }),
        });
      } else {
        route.continue();
      }
    });

    await page.getByRole("button", { name: "編集" }).click();
    await expect(page.locator("#edit-name")).toBeVisible({ timeout: 5_000 });

    await page.locator("#edit-name").fill("渋谷ビル改修工事");
    await page.getByRole("button", { name: "保存" }).click();

    // Edit form should close after successful save
    await expect(page.locator("#edit-name")).not.toBeVisible({ timeout: 5_000 });
  });

  // ─── Tab Navigation ───────────────────────────────

  test("clicking 日報 tab shows reports content", async ({ page }) => {
    await page.getByRole("button", { name: /日報/ }).click();

    // ReportsTab should be visible (tab button becomes active)
    const reportsTab = page.getByRole("button", { name: /日報/ });
    await expect(reportsTab).toHaveClass(/border-primary/);
  });

  test("clicking 安全チェック tab shows safety content", async ({ page }) => {
    await page.getByRole("button", { name: /安全チェック/ }).click();

    const safetyTab = page.getByRole("button", { name: /安全チェック/ });
    await expect(safetyTab).toHaveClass(/border-primary/);
  });

  test("clicking 原価 tab shows cost content", async ({ page }) => {
    await page.getByRole("button", { name: /原価/ }).click();

    const costTab = page.getByRole("button", { name: /原価/ });
    await expect(costTab).toHaveClass(/border-primary/);
  });

  test("clicking 写真 tab shows photos content", async ({ page }) => {
    await page.getByRole("button", { name: /写真/ }).click();

    const photosTab = page.getByRole("button", { name: /写真/ });
    await expect(photosTab).toHaveClass(/border-primary/);
  });

  test("can switch back to 基本情報 tab after navigating away", async ({ page }) => {
    // Navigate to another tab
    await page.getByRole("button", { name: /日報/ }).click();
    const reportsTab = page.getByRole("button", { name: /日報/ });
    await expect(reportsTab).toHaveClass(/border-primary/);

    // Switch back to 基本情報
    await page.getByRole("button", { name: /基本情報/ }).click();

    const infoTab = page.getByRole("button", { name: /基本情報/ });
    await expect(infoTab).toHaveClass(/border-primary/);
    // Edit button should be visible again in InfoTab
    await expect(page.getByRole("button", { name: "編集" })).toBeVisible();
  });
});
