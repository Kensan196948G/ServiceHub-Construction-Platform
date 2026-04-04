import { test, expect } from "@playwright/test";
import {
  setupAuthMocks,
  MOCK_TOKEN,
  MOCK_USER,
  MOCK_KPI,
  MOCK_PROJECTS,
} from "./fixtures/api-mocks";

const MOCK_COST_RECORDS = [
  {
    id: "cost-1",
    project_id: "1",
    category: "LABOR",
    budgeted_amount: 5000000,
    actual_amount: 4800000,
    description: "現場作業員人件費",
    record_date: "2026-04-01",
    vendor_name: null,
    created_at: "2026-04-01T00:00:00Z",
    updated_at: "2026-04-01T00:00:00Z",
  },
  {
    id: "cost-2",
    project_id: "1",
    category: "MATERIAL",
    budgeted_amount: 3000000,
    actual_amount: 3200000,
    description: "鉄筋資材",
    record_date: "2026-04-02",
    vendor_name: "鉄筋商事",
    created_at: "2026-04-02T00:00:00Z",
    updated_at: "2026-04-02T00:00:00Z",
  },
];

const MOCK_COST_SUMMARY = {
  total_budgeted: 8000000,
  total_actual: 8000000,
  variance: 0,
  by_category: {
    LABOR: { budgeted: 5000000, actual: 4800000 },
    MATERIAL: { budgeted: 3000000, actual: 3200000 },
  },
};

test.describe("Cost CRUD", () => {
  test.beforeEach(async ({ page }) => {
    await setupAuthMocks(page);

    await page.route("**/api/v1/dashboard/kpi", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ data: MOCK_KPI }),
      });
    });

    await page.route("**/api/v1/projects**", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: MOCK_PROJECTS,
          meta: { page: 1, per_page: 20, total: 2 },
        }),
      });
    });

    await page.route("**/api/v1/projects/1/costs/summary", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ data: MOCK_COST_SUMMARY }),
      });
    });

    await page.route("**/api/v1/projects/1/costs**", (route) => {
      if (route.request().method() === "POST") {
        route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify({
            data: {
              id: "cost-new",
              project_id: "1",
              category: "EQUIPMENT",
              budgeted_amount: 1000000,
              actual_amount: 900000,
              description: "テスト機械費",
              record_date: "2026-04-05",
              vendor_name: null,
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
            data: MOCK_COST_RECORDS,
            meta: { page: 1, per_page: 20, total: 2 },
          }),
        });
      }
    });

    // Login and go to cost page
    await page.goto("/login");
    await page.evaluate(
      ({ token, user }) => {
        localStorage.setItem(
          "servicehub-auth",
          JSON.stringify({ state: { token, user }, version: 0 })
        );
      },
      { token: MOCK_TOKEN, user: MOCK_USER }
    );
    await page.goto("/cost");
    await page.waitForURL("**/cost");
  });

  test("shows project selection prompt", async ({ page }) => {
    await expect(
      page.getByText("プロジェクトを選択してください")
    ).toBeVisible({ timeout: 10_000 });
  });

  test("displays cost records after selecting project", async ({ page }) => {
    // Select first project
    await page.locator("select").first().selectOption("1");

    // Cost records should appear
    await expect(page.getByText("現場作業員人件費")).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.getByText("鉄筋資材")).toBeVisible({ timeout: 10_000 });
  });

  test("shows cost summary cards after selecting project", async ({
    page,
  }) => {
    await page.locator("select").first().selectOption("1");

    // Summary cards should show
    await expect(page.getByText("予算合計")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("実績合計")).toBeVisible({ timeout: 10_000 });
  });

  test("opens create cost record modal", async ({ page }) => {
    await page.locator("select").first().selectOption("1");

    // Wait for data to load
    await expect(page.getByText("現場作業員人件費")).toBeVisible({
      timeout: 10_000,
    });

    // Click new button
    await page.getByRole("button", { name: /新規原価記録/ }).click();

    // Modal should open
    await expect(
      page.getByRole("heading", { name: /新規原価記録作成/ })
    ).toBeVisible({ timeout: 5_000 });
  });

  test("shows category badges in cost table", async ({ page }) => {
    await page.locator("select").first().selectOption("1");

    await expect(page.getByText("労務費")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("材料費")).toBeVisible({ timeout: 10_000 });
  });
});
