import { test, expect } from "@playwright/test";
import {
  setupAuthMocks,
  MOCK_TOKEN,
  MOCK_USER,
  MOCK_PROJECTS,
  MOCK_KPI,
} from "./fixtures/api-mocks";

const MOCK_INCIDENTS = [
  {
    id: "inc-1",
    incident_number: "INC-001",
    title: "サーバー障害",
    description: "本番サーバーが応答なし",
    category: "infrastructure",
    priority: "critical",
    severity: "critical",
    status: "open",
    created_at: "2026-04-04T09:00:00Z",
    updated_at: "2026-04-04T09:00:00Z",
  },
];

test.describe("ITSM CRUD", () => {
  test.beforeEach(async ({ page }) => {
    // Setup auth mocks
    await setupAuthMocks(page);

    // Setup domain mocks (with incidents data, unlike default empty)
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

    await page.route("**/api/v1/itsm/incidents**", (route) => {
      if (route.request().method() === "POST") {
        route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            data: {
              id: "inc-new",
              incident_number: "INC-002",
              title: "テストインシデント",
              description: "E2E テスト用",
              category: "application",
              priority: "medium",
              severity: "minor",
              status: "open",
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
            data: MOCK_INCIDENTS,
            meta: { page: 1, per_page: 20, total: 1 },
          }),
        });
      }
    });

    await page.route("**/api/v1/itsm/changes**", (route) => {
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

    // Login via localStorage
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
    await page.goto("/itsm");
    await page.waitForURL("**/itsm");
  });

  test("displays incident list with data", async ({ page }) => {
    await expect(page.getByText("INC-001")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("サーバー障害")).toBeVisible({ timeout: 10_000 });
  });

  test("shows incident priority and status badges", async ({ page }) => {
    await expect(page.getByText("緊急").first()).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("オープン").first()).toBeVisible({
      timeout: 10_000,
    });
  });

  test("opens create incident modal and fills form", async ({ page }) => {
    await page.getByRole("button", { name: /新規作成/ }).click();

    // Modal should open
    await expect(
      page.getByRole("heading", { name: /インシデント新規作成/ })
    ).toBeVisible({ timeout: 5_000 });

    // Fill form
    await page.getByLabel(/タイトル/).fill("テストインシデント");
    await page.getByLabel(/説明/).fill("E2E テスト用インシデント");

    // Verify filled
    await expect(page.getByLabel(/タイトル/)).toHaveValue("テストインシデント");
  });

  test("switches to change requests tab", async ({ page }) => {
    await page.getByText("変更要求管理").click();
    await expect(page.getByText("変更要求がありません")).toBeVisible({
      timeout: 10_000,
    });
  });

  test("opens edit incident modal", async ({ page }) => {
    await expect(page.getByText("INC-001")).toBeVisible({ timeout: 10_000 });
    await page.getByRole("button", { name: /詳細/ }).first().click();

    // Edit modal should open
    await expect(
      page.getByRole("heading", { name: /インシデント編集/ })
    ).toBeVisible({ timeout: 5_000 });
  });
});
