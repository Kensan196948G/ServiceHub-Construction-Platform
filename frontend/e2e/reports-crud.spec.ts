import { test, expect } from "@playwright/test";
import { loginAndNavigate, MOCK_PROJECTS } from "./fixtures/api-mocks";

const BASE_REPORTS = [
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

const CREATED_REPORT = {
  id: "rep-new",
  project_id: "1",
  report_date: "2026-04-15",
  weather: "RAINY",
  worker_count: 8,
  progress_rate: 70,
  safety_check: true,
  work_content: "E2Eテスト作業",
  safety_notes: null,
  issues: null,
  status: "DRAFT",
  author_id: 1,
  created_at: "2026-04-15T09:00:00Z",
  updated_at: "2026-04-15T09:00:00Z",
};

/** Set up reports page with mutable list supporting CRUD mock responses. */
async function setupCrudPage(page: import("@playwright/test").Page) {
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

  // Mutable list to simulate server-side state changes
  let reportsList = [...BASE_REPORTS];

  await page.route("**/api/v1/projects/1/daily-reports**", (route) => {
    const method = route.request().method();

    if (method === "POST") {
      reportsList = [CREATED_REPORT, ...reportsList];
      route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: CREATED_REPORT }),
      });
    } else if (method === "DELETE") {
      reportsList = reportsList.filter((r) => !route.request().url().includes(r.id));
      route.fulfill({ status: 204 });
    } else if (method === "PUT" || method === "PATCH") {
      const updated = { ...BASE_REPORTS[0], work_content: "更新済み作業内容" };
      reportsList = reportsList.map((r) => (r.id === "rep-1" ? updated : r));
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: updated }),
      });
    } else {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: reportsList,
          meta: { total: reportsList.length, page: 1, per_page: 20 },
        }),
      });
    }
  });

  await page.getByRole("link", { name: "日報", exact: true }).click();
  await page.waitForURL("**/reports");
  await page.locator("select").first().selectOption("1");

  // Wait for initial list to load
  await expect(page.getByText("2026-04-10")).toBeVisible({ timeout: 10_000 });
}

test.describe("Daily Reports CRUD", () => {
  test("creates a new daily report via modal", async ({ page }) => {
    await setupCrudPage(page);

    await page.getByRole("button", { name: "新規日報作成" }).click();
    await expect(
      page.getByRole("heading", { name: "新規日報作成" })
    ).toBeVisible({ timeout: 10_000 });

    // Fill form fields using CSS selectors scoped to the modal overlay
    const modal = page.locator("div.fixed.inset-0");
    await modal.locator('input[type="date"]').fill("2026-04-15");
    await modal.locator("select").first().selectOption("RAINY");

    // Submit
    await modal.getByRole("button", { name: "作成" }).click();

    // Modal should close after successful creation
    await expect(
      page.getByRole("heading", { name: "新規日報作成" })
    ).not.toBeVisible({ timeout: 10_000 });
  });

  test("cancels report creation without creating a report", async ({ page }) => {
    await setupCrudPage(page);

    await page.getByRole("button", { name: "新規日報作成" }).click();
    await expect(
      page.getByRole("heading", { name: "新規日報作成" })
    ).toBeVisible({ timeout: 10_000 });

    // Cancel
    await page.locator("div.fixed.inset-0").getByRole("button", { name: "キャンセル" }).click();

    // Modal should close
    await expect(
      page.getByRole("heading", { name: "新規日報作成" })
    ).not.toBeVisible({ timeout: 5_000 });
  });

  test("edits a report via row expand and edit modal", async ({ page }) => {
    await setupCrudPage(page);

    // Click the first row to expand it
    await page.getByText("2026-04-10").click();

    // Edit button becomes visible inside expanded row
    await expect(
      page.getByRole("button", { name: "編集" }).first()
    ).toBeVisible({ timeout: 10_000 });

    await page.getByRole("button", { name: "編集" }).first().click();
    await expect(
      page.getByRole("heading", { name: "日報編集" })
    ).toBeVisible({ timeout: 10_000 });

    // Modify worker count in edit modal
    const modal = page.locator("div.fixed.inset-0");
    const workerInput = modal.locator('input[type="number"]').first();
    await workerInput.fill("15");

    // Submit update
    await modal.getByRole("button", { name: "更新" }).click();

    // Edit modal should close
    await expect(
      page.getByRole("heading", { name: "日報編集" })
    ).not.toBeVisible({ timeout: 10_000 });
  });

  test("cancels report edit without saving", async ({ page }) => {
    await setupCrudPage(page);

    // Expand first row and open edit modal
    await page.getByText("2026-04-10").click();
    await expect(
      page.getByRole("button", { name: "編集" }).first()
    ).toBeVisible({ timeout: 10_000 });
    await page.getByRole("button", { name: "編集" }).first().click();
    await expect(
      page.getByRole("heading", { name: "日報編集" })
    ).toBeVisible({ timeout: 10_000 });

    // Cancel
    await page.locator("div.fixed.inset-0").getByRole("button", { name: "キャンセル" }).click();

    // Edit modal should close
    await expect(
      page.getByRole("heading", { name: "日報編集" })
    ).not.toBeVisible({ timeout: 5_000 });
  });

  test("deletes a report via row expand and delete button", async ({ page }) => {
    await setupCrudPage(page);

    // Auto-accept the confirm() dialog that appears on delete
    page.on("dialog", (dialog) => dialog.accept());

    // Click first row to expand
    await page.getByText("2026-04-10").click();

    // Delete button is visible inside expanded row
    await expect(
      page.getByRole("button", { name: "削除" }).first()
    ).toBeVisible({ timeout: 10_000 });

    await page.getByRole("button", { name: "削除" }).first().click();

    // After deletion the list re-fetches; deleted row should eventually vanish
    await expect(
      page.getByRole("button", { name: "削除" }).first()
    ).not.toBeVisible({ timeout: 10_000 });
  });

  test("shows create form with correct initial fields", async ({ page }) => {
    await setupCrudPage(page);

    await page.getByRole("button", { name: "新規日報作成" }).click();
    await expect(
      page.getByRole("heading", { name: "新規日報作成" })
    ).toBeVisible({ timeout: 10_000 });

    // Verify key form elements exist
    const modal = page.locator("div.fixed.inset-0");
    await expect(modal.locator('input[type="date"]')).toBeVisible();
    await expect(modal.locator("select").first()).toBeVisible();
    await expect(modal.getByLabel("安全確認済")).toBeVisible();
    await expect(modal.getByRole("button", { name: "作成" })).toBeVisible();
    await expect(modal.getByRole("button", { name: "キャンセル" })).toBeVisible();
  });
});
