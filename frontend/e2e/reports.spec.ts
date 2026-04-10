import { test, expect } from "@playwright/test";
import { loginAndNavigate, MOCK_PROJECTS } from "./fixtures/api-mocks";

const MOCK_DAILY_REPORTS = [
  {
    id: "rep-1",
    project_id: "1",
    report_date: "2026-04-10",
    weather: "SUNNY",
    worker_count: 12,
    progress_rate: 65,
    safety_check: true,
    work_content: "2階スラブ配筋作業",
    safety_notes: "安全帯着用確認済み",
    issues: null,
    status: "SUBMITTED",
    author_id: 1,
    created_at: "2026-04-10T09:00:00Z",
    updated_at: "2026-04-10T09:00:00Z",
  },
  {
    id: "rep-2",
    project_id: "1",
    report_date: "2026-04-09",
    weather: "CLOUDY",
    worker_count: 10,
    progress_rate: 60,
    safety_check: true,
    work_content: "基礎コンクリート打設",
    safety_notes: null,
    issues: null,
    status: "APPROVED",
    author_id: 1,
    created_at: "2026-04-09T09:00:00Z",
    updated_at: "2026-04-09T10:00:00Z",
  },
];

/** Navigate to daily reports page with projects and reports mocked. */
async function setupReportsPage(page: import("@playwright/test").Page) {
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

  await page.route("**/api/v1/projects/1/daily-reports**", (route) => {
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: MOCK_DAILY_REPORTS,
        meta: { total: 2, page: 1, per_page: 20 },
      }),
    });
  });

  await page.getByRole("link", { name: "日報" }).click();
  await page.waitForURL("**/reports");
}

test.describe("Daily Reports Page", () => {
  test("displays page heading", async ({ page }) => {
    await setupReportsPage(page);
    await expect(
      page.getByRole("heading", { name: /日報管理/ })
    ).toBeVisible({ timeout: 10_000 });
  });

  test("shows project selector dropdown", async ({ page }) => {
    await setupReportsPage(page);
    const selector = page.locator("select").first();
    await expect(selector).toBeVisible({ timeout: 10_000 });
  });

  test("shows empty state when no project is selected", async ({ page }) => {
    await setupReportsPage(page);
    await expect(
      page.getByText("プロジェクトを選択してください")
    ).toBeVisible({ timeout: 10_000 });
  });

  test("loads report list after selecting a project", async ({ page }) => {
    await setupReportsPage(page);
    await page.locator("select").first().selectOption("1");

    // Both report dates should appear in the table
    await expect(page.getByText("2026-04-10")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("2026-04-09")).toBeVisible();
  });

  test("shows weather badges for each report", async ({ page }) => {
    await setupReportsPage(page);
    await page.locator("select").first().selectOption("1");

    await expect(page.getByText("2026-04-10")).toBeVisible({ timeout: 10_000 });
    // SUNNY → "晴れ ☀️", CLOUDY → "曇り ☁️"
    await expect(page.getByText("晴れ ☀️")).toBeVisible();
    await expect(page.getByText("曇り ☁️")).toBeVisible();
  });

  test("shows status badges for each report", async ({ page }) => {
    await setupReportsPage(page);
    await page.locator("select").first().selectOption("1");

    await expect(page.getByText("2026-04-10")).toBeVisible({ timeout: 10_000 });
    // SUBMITTED → "提出済", APPROVED → "承認済"
    await expect(page.getByText("提出済")).toBeVisible();
    await expect(page.getByText("承認済")).toBeVisible();
  });

  test("shows empty state when no reports exist for project", async ({
    page,
  }) => {
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
    await page.route("**/api/v1/projects/1/daily-reports**", (route) => {
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

    await page.getByRole("link", { name: "日報" }).click();
    await page.waitForURL("**/reports");
    await page.locator("select").first().selectOption("1");

    await expect(page.getByText("日報がまだありません")).toBeVisible({
      timeout: 10_000,
    });
  });

  test("新規日報作成 button is disabled when no project selected", async ({
    page,
  }) => {
    await setupReportsPage(page);
    const createBtn = page.getByRole("button", { name: "新規日報作成" });
    await expect(createBtn).toBeDisabled({ timeout: 10_000 });
  });

  test("新規日報作成 button is enabled after selecting project", async ({
    page,
  }) => {
    await setupReportsPage(page);
    await page.locator("select").first().selectOption("1");

    const createBtn = page.getByRole("button", { name: "新規日報作成" });
    await expect(createBtn).toBeEnabled({ timeout: 10_000 });
  });

  test("opens create modal when 新規日報作成 clicked", async ({ page }) => {
    await setupReportsPage(page);
    await page.locator("select").first().selectOption("1");

    await page.getByRole("button", { name: "新規日報作成" }).click();
    await expect(page.getByText("新規日報作成")).toBeVisible({
      timeout: 10_000,
    });
  });
});
