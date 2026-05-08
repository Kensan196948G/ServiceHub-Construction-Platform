import { test, expect } from "@playwright/test";
import {
  loginAndNavigate,
  setupAllApiMocks,
  MOCK_USER,
  MOCK_TOKEN,
  MOCK_REFRESH_TOKEN,
} from "./fixtures/api-mocks";

// Sample delivery rows for mock responses
const MOCK_DELIVERIES = [
  {
    id: "d1",
    user_id: "u1",
    event_key: "daily_report_submitted",
    channel: "EMAIL",
    status: "SENT",
    failure_kind: null,
    attempts: 1,
    subject: "日報が提出されました",
    body_preview: "preview",
    created_at: "2026-04-11T10:00:00Z",
    updated_at: "2026-04-11T10:00:00Z",
  },
  {
    id: "d2",
    user_id: "u2",
    event_key: "safety_incident_created",
    channel: "EMAIL",
    status: "FAILED",
    failure_kind: "transient",
    attempts: 3,
    subject: "安全インシデントが作成されました",
    body_preview: "preview",
    created_at: "2026-04-11T11:00:00Z",
    updated_at: "2026-04-11T11:00:00Z",
  },
];

/** Navigate to the notification deliveries admin page. */
async function goToDeliveriesPage(
  page: import("@playwright/test").Page,
  opts: {
    deliveries?: typeof MOCK_DELIVERIES;
    retryResult?: { retried_count: number; message: string };
  } = {},
) {
  await loginAndNavigate(page);

  // Override deliveries mock (after loginAndNavigate to ensure last-wins)
  if (opts.deliveries !== undefined) {
    await page.route("**/api/v1/notifications/deliveries**", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: opts.deliveries,
          meta: {
            total: opts.deliveries!.length,
            page: 1,
            per_page: 20,
            pages: 1,
          },
        }),
      });
    });
  }

  // Override retry mock if specified
  if (opts.retryResult !== undefined) {
    await page.route("**/api/v1/notifications/retry", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ data: opts.retryResult }),
      });
    });
  }

  await page.getByRole("link", { name: "通知設定" }).click();
  await page.waitForURL("**/admin/notifications");
  await expect(
    page.getByRole("heading", { name: "通知配信履歴" }),
  ).toBeVisible({ timeout: 10_000 });
}

test.describe("Notification Deliveries Admin Page", () => {
  test("ADMIN can navigate to notification deliveries page", async ({
    page,
  }) => {
    await goToDeliveriesPage(page);

    await expect(page.getByTestId("deliveries-table")).toBeVisible();
    await expect(page.getByTestId("retry-button")).toBeVisible();
  });

  test("shows empty state when no deliveries exist", async ({ page }) => {
    await goToDeliveriesPage(page, { deliveries: [] });

    await expect(page.getByTestId("deliveries-empty")).toBeVisible();
    await expect(page.getByTestId("deliveries-empty")).toHaveText(
      "配信履歴がありません。",
    );
  });

  test("shows delivery rows with correct status badges", async ({ page }) => {
    await goToDeliveriesPage(page, { deliveries: MOCK_DELIVERIES });

    const rows = page.getByTestId("delivery-row");
    await expect(rows).toHaveCount(2);

    // First row: SENT
    await expect(rows.nth(0).getByText("SENT")).toBeVisible();
    await expect(rows.nth(0).getByText("EMAIL")).toBeVisible();
    await expect(rows.nth(0).getByText("daily_report_submitted")).toBeVisible();

    // Second row: FAILED transient
    await expect(rows.nth(1).getByText("FAILED")).toBeVisible();
    await expect(rows.nth(1).getByText("transient")).toBeVisible();
  });

  test("retry button triggers POST /notifications/retry and shows result", async ({
    page,
  }) => {
    const retryResult = {
      retried_count: 1,
      message: "1 件の transient 失敗通知を再送信しました。",
    };
    await goToDeliveriesPage(page, { retryResult });

    await page.getByTestId("retry-button").click();

    await expect(page.getByTestId("retry-result")).toBeVisible({
      timeout: 5_000,
    });
    await expect(page.getByTestId("retry-result")).toContainText(
      "1 件の transient 失敗通知を再送信しました。",
    );
  });

  test("retry button shows no-op message when retried_count is 0", async ({
    page,
  }) => {
    const retryResult = {
      retried_count: 0,
      message: "リトライ対象の通知がありません。",
    };
    await goToDeliveriesPage(page, { retryResult });

    await page.getByTestId("retry-button").click();

    await expect(page.getByTestId("retry-result")).toBeVisible({
      timeout: 5_000,
    });
    await expect(page.getByTestId("retry-result")).toContainText(
      "リトライ対象の通知がありません。",
    );
  });

  test("non-ADMIN user sees 通知設定 but not ユーザー管理 nav link", async ({ page }) => {
    // Setup API mocks without setting ADMIN role in localStorage
    await setupAllApiMocks(page);

    await page.goto("/login");
    // Set VIEWER role directly in localStorage (mirrors loginAndNavigate but with VIEWER)
    await page.evaluate(
      ({ token, refreshToken, user }) => {
        localStorage.setItem(
          "servicehub-auth",
          JSON.stringify({ state: { token, refreshToken, user }, version: 0 }),
        );
      },
      {
        token: MOCK_TOKEN,
        refreshToken: MOCK_REFRESH_TOKEN,
        user: { ...MOCK_USER, role: "VIEWER" },
      },
    );
    await page.goto("/dashboard");
    await page.waitForURL("**/dashboard");

    // 通知設定 is now visible to all users (not ADMIN-only)
    await expect(
      page.getByRole("link", { name: "通知設定" }),
    ).toBeVisible();
    // ユーザー管理 remains ADMIN-only
    await expect(
      page.getByRole("link", { name: "ユーザー管理" }),
    ).not.toBeVisible();
  });
});
