import { test, expect } from "@playwright/test";
import {
  loginAndNavigate,
  MOCK_COST_RECORDS,
  MOCK_PROJECTS,
} from "./fixtures/api-mocks";

const SUMMARY_PAYLOAD = {
  project_id: "1",
  total_budgeted: 10_000_000,
  total_actual: 9_200_000,
  variance: 800_000,
  by_category: {
    LABOR: { budgeted: 10_000_000, actual: 9_200_000, variance: 800_000 },
  },
};

/** Navigate to /cost with projects, cost-records, and cost-summary mocked. */
async function setupCostPage(
  page: import("@playwright/test").Page,
  options: { records?: typeof MOCK_COST_RECORDS; summary?: typeof SUMMARY_PAYLOAD | null } = {},
) {
  const records = options.records ?? MOCK_COST_RECORDS;
  const summary = options.summary === undefined ? SUMMARY_PAYLOAD : options.summary;

  await loginAndNavigate(page);

  await page.route("**/api/v1/projects**", (route) => {
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: MOCK_PROJECTS,
        meta: { page: 1, per_page: 100, total: MOCK_PROJECTS.length },
      }),
    });
  });

  await page.route("**/api/v1/projects/1/cost-records**", (route) => {
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: records,
        meta: { page: 1, per_page: 20, total: records.length, pages: 1 },
      }),
    });
  });

  await page.route("**/api/v1/projects/1/cost-summary**", (route) => {
    if (summary === null) {
      route.fulfill({ status: 500, body: "Internal Server Error" });
      return;
    }
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ data: summary }),
    });
  });

  await page.goto("/cost");
  await page.waitForURL("**/cost");
}

test.describe("Cost Page", () => {
  test("displays page heading", async ({ page }) => {
    await setupCostPage(page);
    await expect(
      page.getByRole("heading", { name: /原価管理/ }),
    ).toBeVisible({ timeout: 10_000 });
  });

  test("shows empty state before project is selected", async ({ page }) => {
    await setupCostPage(page);
    await expect(
      page.getByText("プロジェクトを選択してください"),
    ).toBeVisible({ timeout: 10_000 });
  });

  test("displays project selector dropdown", async ({ page }) => {
    await setupCostPage(page);
    // First <select> on the page is the project selector
    const selector = page.locator("select").first();
    await expect(selector).toBeVisible({ timeout: 10_000 });
    await expect(selector).toContainText("PRJ-001");
  });

  test("renders cost summary cards after project selection", async ({ page }) => {
    await setupCostPage(page);

    await page.locator("select").first().selectOption("1");

    // 4 summary cards must appear: 予算合計 / 実績合計 / 差異 / 達成率
    await expect(page.getByText("予算合計")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("実績合計")).toBeVisible();
    await expect(page.getByText("差異")).toBeVisible();
    await expect(page.getByText("達成率")).toBeVisible();

    // Budget total = ¥10,000,000 — match digits robustly across Intl variants
    await expect(page.getByText(/10,000,000/).first()).toBeVisible();
    // Actual total = ¥9,200,000
    await expect(page.getByText(/9,200,000/).first()).toBeVisible();
    // Achievement rate = round(9_200_000 / 10_000_000 * 100) = 92%
    await expect(page.getByText(/^92%$/)).toBeVisible();
  });

  test("shows records table rows after project selection", async ({ page }) => {
    await setupCostPage(page);

    await page.locator("select").first().selectOption("1");

    // Table header (visible when records exist)
    await expect(
      page.getByRole("columnheader", { name: "カテゴリ" }),
    ).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole("columnheader", { name: "予算" })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "実績" })).toBeVisible();

    // Record row shows category badge (LABOR → 労務費) and the description
    await expect(page.getByText("労務費").first()).toBeVisible();
    await expect(page.getByText("テストコスト")).toBeVisible();
  });

  test("renders empty records state for projects with no cost records", async ({ page }) => {
    await setupCostPage(page, { records: [], summary: { ...SUMMARY_PAYLOAD, total_budgeted: 0, total_actual: 0, variance: 0 } });

    await page.locator("select").first().selectOption("1");

    await expect(
      page.getByText("原価記録がありません"),
    ).toBeVisible({ timeout: 10_000 });
  });

  test("opens new cost record modal when button clicked", async ({ page }) => {
    await setupCostPage(page);

    // The "新規原価記録" button is disabled until a project is selected
    const newButton = page.getByRole("button", { name: /新規原価記録/ });
    await expect(newButton).toBeDisabled();

    await page.locator("select").first().selectOption("1");
    await expect(newButton).toBeEnabled({ timeout: 10_000 });
    await newButton.click();

    // Modal opens with required form fields
    await expect(
      page.getByRole("heading", { name: /新規原価記録作成/ }),
    ).toBeVisible({ timeout: 10_000 });
    await expect(page.getByLabel(/日付/)).toBeVisible();
    await expect(page.getByLabel(/カテゴリ/)).toBeVisible();
    await expect(page.getByLabel(/予算金額/)).toBeVisible();
    await expect(page.getByLabel(/実績金額/)).toBeVisible();
  });

  test("shows error banner when cost-records API fails", async ({ page }) => {
    await loginAndNavigate(page);

    await page.route("**/api/v1/projects**", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: MOCK_PROJECTS,
          meta: { page: 1, per_page: 100, total: MOCK_PROJECTS.length },
        }),
      });
    });
    // Simulate 500 for cost-records endpoint
    await page.route("**/api/v1/projects/1/cost-records**", (route) => {
      route.fulfill({ status: 500, body: "Internal Server Error" });
    });
    // Summary still works so only records fail
    await page.route("**/api/v1/projects/1/cost-summary**", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ data: SUMMARY_PAYLOAD }),
      });
    });

    await page.goto("/cost");
    await page.waitForURL("**/cost");
    await page.locator("select").first().selectOption("1");

    await expect(page.getByRole("alert")).toBeVisible({ timeout: 10_000 });
  });
});
