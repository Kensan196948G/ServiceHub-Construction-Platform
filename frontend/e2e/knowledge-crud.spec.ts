import { test, expect } from "@playwright/test";
import {
  setupAuthMocks,
  MOCK_TOKEN,
  MOCK_USER,
  MOCK_KPI,
  MOCK_PROJECTS,
} from "./fixtures/api-mocks";

const MOCK_ARTICLES = [
  {
    id: "art-1",
    title: "足場組立の安全手順",
    content: "足場組立時には必ずヘルメットと安全帯を着用すること。",
    category: "SAFETY",
    tags: "足場,安全",
    is_published: true,
    view_count: 42,
    rating: 4.5,
    created_at: "2026-03-01T00:00:00Z",
    updated_at: "2026-03-15T00:00:00Z",
  },
  {
    id: "art-2",
    title: "コンクリート品質管理ガイド",
    content: "スランプ試験の実施手順と合格基準について説明します。",
    category: "QUALITY",
    tags: "コンクリート,品質",
    is_published: true,
    view_count: 28,
    rating: null,
    created_at: "2026-03-10T00:00:00Z",
    updated_at: "2026-03-10T00:00:00Z",
  },
  {
    id: "art-3",
    title: "非公開の技術メモ",
    content: "内部検討用の技術ノートです。",
    category: "TECHNICAL",
    tags: "",
    is_published: false,
    view_count: 3,
    rating: null,
    created_at: "2026-04-01T00:00:00Z",
    updated_at: "2026-04-01T00:00:00Z",
  },
];

test.describe("Knowledge CRUD", () => {
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

    await page.route("**/api/v1/itsm/incidents**", (route) => {
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

    await page.route("**/api/v1/knowledge/articles**", (route) => {
      if (route.request().method() === "POST") {
        route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify({
            data: {
              id: "art-new",
              title: "新規テスト記事",
              content: "E2Eテスト用の記事内容",
              category: "GENERAL",
              tags: "テスト",
              is_published: true,
              view_count: 0,
              rating: null,
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
            data: MOCK_ARTICLES,
            meta: { page: 1, per_page: 100, total: 3 },
          }),
        });
      }
    });

    await page.route("**/api/v1/knowledge/search", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ai_answer: "足場組立時にはヘルメットと安全帯が必要です。",
          sources: [MOCK_ARTICLES[0]],
        }),
      });
    });

    // Login and navigate
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
    await page.goto("/knowledge");
    await page.waitForURL("**/knowledge");
  });

  test("displays knowledge articles", async ({ page }) => {
    await expect(page.getByText("足場組立の安全手順")).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.getByText("コンクリート品質管理ガイド")).toBeVisible({
      timeout: 10_000,
    });
  });

  test("shows category badges", async ({ page }) => {
    await expect(page.getByText("安全").first()).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.getByText("品質").first()).toBeVisible({
      timeout: 10_000,
    });
  });

  test("shows unpublished badge", async ({ page }) => {
    await expect(page.getByText("非公開").first()).toBeVisible({
      timeout: 10_000,
    });
  });

  test("opens create article modal", async ({ page }) => {
    await page.getByRole("button", { name: /新規記事作成/ }).click();

    await expect(
      page.getByRole("heading", { name: /新規記事作成/ })
    ).toBeVisible({ timeout: 5_000 });

    // Fill title
    await page.getByLabel(/タイトル/).fill("新規テスト記事");
    await expect(page.getByLabel(/タイトル/)).toHaveValue("新規テスト記事");
  });

  test("opens article detail modal on click", async ({ page }) => {
    await page.getByText("足場組立の安全手順").first().click();

    // Detail modal should show article title in heading
    await expect(
      page.getByText("足場組立の安全手順").nth(1)
    ).toBeVisible({ timeout: 5_000 });
  });

  test("AI search returns answer", async ({ page }) => {
    const searchInput = page.locator("input[placeholder*='質問']");
    await searchInput.fill("足場の安全手順は？");
    await page.getByRole("button", { name: /AI検索/ }).click();

    await expect(
      page.getByText("足場組立時にはヘルメットと安全帯が必要です。")
    ).toBeVisible({ timeout: 10_000 });
  });

  test("keyword filter works", async ({ page }) => {
    const searchInput = page.locator("input[placeholder*='キーワード']");
    await searchInput.fill("コンクリート");

    // Only matching article should be visible
    await expect(page.getByText("コンクリート品質管理ガイド")).toBeVisible({
      timeout: 5_000,
    });
    // Non-matching should disappear
    await expect(page.getByText("足場組立の安全手順")).not.toBeVisible();
  });
});
