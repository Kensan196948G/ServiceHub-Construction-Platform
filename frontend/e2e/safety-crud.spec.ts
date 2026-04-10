import { test, expect } from "@playwright/test";
import { loginAndNavigate, MOCK_PROJECTS } from "./fixtures/api-mocks";

const BASE_SAFETY_CHECKS = [
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

const CREATED_SAFETY_CHECK = {
  id: "sc-new",
  project_id: "1",
  check_date: "2026-04-15",
  check_type: "WEEKLY",
  items_total: 15,
  items_ok: 15,
  items_ng: 0,
  overall_result: "合格",
  notes: null,
  created_at: "2026-04-15T09:00:00Z",
};

const BASE_QUALITY_INSPECTIONS = [
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

const CREATED_QUALITY_INSPECTION = {
  id: "qi-new",
  project_id: "1",
  inspection_date: "2026-04-15",
  inspection_type: "鉄筋径検査",
  target_item: "1階柱配筋",
  standard_value: "D22",
  measured_value: "D22",
  result: "合格",
  created_at: "2026-04-15T10:00:00Z",
};

/** Set up safety page with mutable list supporting CRUD mock responses. */
async function setupSafetyCrudPage(page: import("@playwright/test").Page) {
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

  let checksList = [...BASE_SAFETY_CHECKS];

  await page.route("**/api/v1/projects/1/safety-checks**", (route) => {
    const method = route.request().method();
    if (method === "POST") {
      checksList = [CREATED_SAFETY_CHECK, ...checksList];
      route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: CREATED_SAFETY_CHECK }),
      });
    } else if (method === "DELETE") {
      checksList = checksList.filter((c) => !route.request().url().includes(c.id));
      route.fulfill({ status: 204 });
    } else {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: checksList,
          meta: { total: checksList.length, page: 1, per_page: 20 },
        }),
      });
    }
  });

  let inspectionsList = [...BASE_QUALITY_INSPECTIONS];

  await page.route("**/api/v1/projects/1/quality-inspections**", (route) => {
    const method = route.request().method();
    if (method === "POST") {
      inspectionsList = [CREATED_QUALITY_INSPECTION, ...inspectionsList];
      route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: CREATED_QUALITY_INSPECTION }),
      });
    } else if (method === "DELETE") {
      inspectionsList = inspectionsList.filter(
        (i) => !route.request().url().includes(i.id)
      );
      route.fulfill({ status: 204 });
    } else {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: inspectionsList,
          meta: { total: inspectionsList.length, page: 1, per_page: 20 },
        }),
      });
    }
  });

  await page.getByRole("link", { name: "安全品質" }).click();
  await page.waitForURL("**/safety");
  await page.locator("select").first().selectOption("1");

  // Wait for safety checks list (default tab) to load
  await expect(page.getByText("2026-04-10")).toBeVisible({ timeout: 10_000 });
}

test.describe("Safety Checks CRUD", () => {
  test("creates a new safety check via modal", async ({ page }) => {
    await setupSafetyCrudPage(page);

    await page.getByRole("button", { name: "新規作成" }).click();
    await expect(
      page.getByRole("heading", { name: "安全チェック新規作成" })
    ).toBeVisible({ timeout: 10_000 });

    // Fill check form fields
    const modal = page.locator("div.fixed.inset-0");
    await modal.locator('input[type="date"]').fill("2026-04-15");
    // Select "週次" for check type
    await modal.locator("select").first().selectOption("WEEKLY");

    // Submit
    await modal.getByRole("button", { name: "作成" }).click();

    // Modal should close
    await expect(
      page.getByRole("heading", { name: "安全チェック新規作成" })
    ).not.toBeVisible({ timeout: 10_000 });
  });

  test("cancels safety check creation", async ({ page }) => {
    await setupSafetyCrudPage(page);

    await page.getByRole("button", { name: "新規作成" }).click();
    await expect(
      page.getByRole("heading", { name: "安全チェック新規作成" })
    ).toBeVisible({ timeout: 10_000 });

    await page.locator("div.fixed.inset-0").getByRole("button", { name: "キャンセル" }).click();

    await expect(
      page.getByRole("heading", { name: "安全チェック新規作成" })
    ).not.toBeVisible({ timeout: 5_000 });
  });

  test("deletes a safety check with confirm dialog", async ({ page }) => {
    await setupSafetyCrudPage(page);

    // Auto-accept the window.confirm() that appears on delete
    page.on("dialog", (dialog) => dialog.accept());

    // Delete button is directly in the table row (no row-expand needed)
    await expect(
      page.getByRole("button", { name: "削除" }).first()
    ).toBeVisible({ timeout: 10_000 });

    await page.getByRole("button", { name: "削除" }).first().click();

    // After deletion, sc-1 (DAILY/2026-04-10) is gone; sc-2 (WEEKLY/2026-04-09) remains.
    // Expect exactly one delete button remaining, not zero.
    await expect(
      page.getByRole("button", { name: "削除" })
    ).toHaveCount(1, { timeout: 10_000 });
  });

  test("shows create form with correct fields for safety check tab", async ({
    page,
  }) => {
    await setupSafetyCrudPage(page);

    await page.getByRole("button", { name: "新規作成" }).click();
    await expect(
      page.getByRole("heading", { name: "安全チェック新規作成" })
    ).toBeVisible({ timeout: 10_000 });

    const modal = page.locator("div.fixed.inset-0");
    // Date, type select, number inputs, result select, notes textarea
    await expect(modal.locator('input[type="date"]')).toBeVisible();
    await expect(modal.locator("select").first()).toBeVisible();
    await expect(modal.locator('input[type="number"]').first()).toBeVisible();
    await expect(modal.getByRole("button", { name: "作成" })).toBeVisible();
    await expect(modal.getByRole("button", { name: "キャンセル" })).toBeVisible();
  });
});

test.describe("Quality Inspections CRUD", () => {
  test("creates a new quality inspection via inspections tab", async ({
    page,
  }) => {
    await setupSafetyCrudPage(page);

    // Switch to inspections tab first, then open modal
    await page.getByRole("button", { name: /品質検査/ }).click();
    // Wait for inspections data to load
    await expect(page.getByText("コンクリート強度")).toBeVisible({ timeout: 10_000 });

    await page.getByRole("button", { name: "新規作成" }).click();
    await expect(
      page.getByRole("heading", { name: "品質検査新規作成" })
    ).toBeVisible({ timeout: 10_000 });

    // Fill inspection form
    const modal = page.locator("div.fixed.inset-0");
    await modal.locator('input[type="date"]').fill("2026-04-15");
    // inspection_type (first text input after date)
    await modal.locator('input[type="text"]').nth(0).fill("鉄筋径検査");
    // target_item (second text input)
    await modal.locator('input[type="text"]').nth(1).fill("1階柱配筋");

    // Submit
    await modal.getByRole("button", { name: "作成" }).click();

    // Modal should close
    await expect(
      page.getByRole("heading", { name: "品質検査新規作成" })
    ).not.toBeVisible({ timeout: 10_000 });
  });

  test("cancels quality inspection creation", async ({ page }) => {
    await setupSafetyCrudPage(page);

    await page.getByRole("button", { name: /品質検査/ }).click();
    await expect(page.getByText("コンクリート強度")).toBeVisible({ timeout: 10_000 });

    await page.getByRole("button", { name: "新規作成" }).click();
    await expect(
      page.getByRole("heading", { name: "品質検査新規作成" })
    ).toBeVisible({ timeout: 10_000 });

    await page.locator("div.fixed.inset-0").getByRole("button", { name: "キャンセル" }).click();

    await expect(
      page.getByRole("heading", { name: "品質検査新規作成" })
    ).not.toBeVisible({ timeout: 5_000 });
  });

  test("deletes a quality inspection with confirm dialog", async ({ page }) => {
    await setupSafetyCrudPage(page);

    page.on("dialog", (dialog) => dialog.accept());

    // Switch to inspections tab
    await page.getByRole("button", { name: /品質検査/ }).click();
    await expect(page.getByText("コンクリート強度")).toBeVisible({ timeout: 10_000 });

    // Delete button is in the table row
    await expect(
      page.getByRole("button", { name: "削除" }).first()
    ).toBeVisible({ timeout: 10_000 });

    await page.getByRole("button", { name: "削除" }).first().click();

    // After deletion the row should vanish
    await expect(
      page.getByText("コンクリート強度")
    ).not.toBeVisible({ timeout: 10_000 });
  });

  test("shows create form with correct fields for inspection tab", async ({
    page,
  }) => {
    await setupSafetyCrudPage(page);

    await page.getByRole("button", { name: /品質検査/ }).click();
    await expect(page.getByText("コンクリート強度")).toBeVisible({ timeout: 10_000 });

    await page.getByRole("button", { name: "新規作成" }).click();
    await expect(
      page.getByRole("heading", { name: "品質検査新規作成" })
    ).toBeVisible({ timeout: 10_000 });

    const modal = page.locator("div.fixed.inset-0");
    await expect(modal.locator('input[type="date"]')).toBeVisible();
    await expect(modal.locator('input[type="text"]').first()).toBeVisible();
    await expect(modal.getByRole("button", { name: "作成" })).toBeVisible();
    await expect(modal.getByRole("button", { name: "キャンセル" })).toBeVisible();
  });
});
