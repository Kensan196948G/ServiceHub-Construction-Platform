import { test, expect } from "@playwright/test";
import { loginAndNavigate, MOCK_PROJECTS } from "./fixtures/api-mocks";

const MOCK_SAFETY_CHECKS = [
  {
    id: "sc-1",
    project_id: "1",
    check_date: "2026-04-10",
    check_type: "DAILY",
    items_total: 10,
    items_ok: 9,
    items_ng: 1,
    overall_result: "合格",
    notes: "軽微なNG項目あり、翌日フォロー",
    created_at: "2026-04-10T09:00:00Z",
  },
  {
    id: "sc-2",
    project_id: "1",
    check_date: "2026-04-09",
    check_type: "WEEKLY",
    items_total: 20,
    items_ok: 20,
    items_ng: 0,
    overall_result: "合格",
    notes: null,
    created_at: "2026-04-09T09:00:00Z",
  },
];

const MOCK_QUALITY_INSPECTIONS = [
  {
    id: "qi-1",
    project_id: "1",
    inspection_date: "2026-04-10",
    inspection_type: "コンクリート強度",
    target_item: "基礎コンクリート",
    standard_value: "21N/mm²",
    measured_value: "24N/mm²",
    result: "合格",
    created_at: "2026-04-10T10:00:00Z",
  },
];

/** Navigate to safety page with projects and safety data mocked. */
async function setupSafetyPage(page: import("@playwright/test").Page) {
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

  await page.route("**/api/v1/projects/1/safety-checks**", (route) => {
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: MOCK_SAFETY_CHECKS,
        meta: { total: 2, page: 1, per_page: 20 },
      }),
    });
  });

  await page.route("**/api/v1/projects/1/quality-inspections**", (route) => {
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: MOCK_QUALITY_INSPECTIONS,
        meta: { total: 1, page: 1, per_page: 20 },
      }),
    });
  });

  await page.getByRole("link", { name: "安全品質" }).click();
  await page.waitForURL("**/safety");
}

test.describe("Safety Page", () => {
  test("displays page heading", async ({ page }) => {
    await setupSafetyPage(page);
    await expect(
      page.getByRole("heading", { name: /安全品質管理/ })
    ).toBeVisible({ timeout: 10_000 });
  });

  test("shows project selector dropdown", async ({ page }) => {
    await setupSafetyPage(page);
    const selector = page.locator("select").first();
    await expect(selector).toBeVisible({ timeout: 10_000 });
  });

  test("shows empty state when no project is selected", async ({ page }) => {
    await setupSafetyPage(page);
    await expect(
      page.getByText("プロジェクトを選択してください")
    ).toBeVisible({ timeout: 10_000 });
  });

  test("shows tab buttons for checks and inspections", async ({ page }) => {
    await setupSafetyPage(page);
    await expect(page.getByRole("button", { name: /安全チェック/ })).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.getByRole("button", { name: /品質検査/ })).toBeVisible();
  });

  test("loads safety checks after selecting a project", async ({ page }) => {
    await setupSafetyPage(page);
    await page.locator("select").first().selectOption("1");

    // Both safety check rows should appear
    await expect(page.getByText("2026-04-10")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("2026-04-09")).toBeVisible();
  });

  test("shows check type badges in table", async ({ page }) => {
    await setupSafetyPage(page);
    await page.locator("select").first().selectOption("1");

    await expect(page.getByText("2026-04-10")).toBeVisible({ timeout: 10_000 });
    // Check type badges (日次 / 週次) should appear
    await expect(page.getByText("日次")).toBeVisible();
    await expect(page.getByText("週次")).toBeVisible();
  });

  test("switches to quality inspections tab", async ({ page }) => {
    await setupSafetyPage(page);
    await page.locator("select").first().selectOption("1");

    // Wait for safety checks to load first
    await expect(page.getByText("2026-04-10")).toBeVisible({ timeout: 10_000 });

    // Switch to quality inspection tab
    await page.getByRole("button", { name: /品質検査/ }).click();

    // Inspection data should appear
    await expect(page.getByText("コンクリート強度")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("基礎コンクリート")).toBeVisible();
  });

  test("shows empty state when no safety checks exist", async ({ page }) => {
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
    await page.route("**/api/v1/projects/1/safety-checks**", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: [],
          meta: { total: 0, page: 1, per_page: 20 },
        }),
      });
    });

    await page.getByRole("link", { name: "安全品質" }).click();
    await page.waitForURL("**/safety");
    await page.locator("select").first().selectOption("1");

    await expect(page.getByText("安全チェックデータがありません")).toBeVisible({
      timeout: 10_000,
    });
  });

  test("新規作成 button is disabled when no project selected", async ({
    page,
  }) => {
    await setupSafetyPage(page);
    const createBtn = page.getByRole("button", { name: "新規作成" });
    await expect(createBtn).toBeDisabled({ timeout: 10_000 });
  });

  test("新規作成 button is enabled after selecting project", async ({ page }) => {
    await setupSafetyPage(page);
    await page.locator("select").first().selectOption("1");

    const createBtn = page.getByRole("button", { name: "新規作成" });
    await expect(createBtn).toBeEnabled({ timeout: 10_000 });
  });

  test("opens create modal when 新規作成 clicked", async ({ page }) => {
    await setupSafetyPage(page);
    await page.locator("select").first().selectOption("1");

    await page.getByRole("button", { name: "新規作成" }).click();
    await expect(
      page.getByText("安全チェック新規作成")
    ).toBeVisible({ timeout: 10_000 });
  });
});
