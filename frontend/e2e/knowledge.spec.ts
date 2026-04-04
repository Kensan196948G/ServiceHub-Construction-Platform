import { test, expect } from "@playwright/test";
import { loginAndNavigate } from "./fixtures/api-mocks";

test.describe("Knowledge Page", () => {
  test.beforeEach(async ({ page }) => {
    await loginAndNavigate(page);

    // Mock knowledge articles API
    await page.route("**/api/v1/knowledge/articles**", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: [
            {
              id: "1",
              title: "テストナレッジ記事",
              content: "テスト内容です",
              category: "TECHNICAL",
              tags: "test",
              is_published: true,
              view_count: 5,
              rating: null,
              created_at: "2026-04-04T09:00:00Z",
              updated_at: "2026-04-04T09:00:00Z",
            },
          ],
          meta: { page: 1, per_page: 100, total: 1 },
        }),
      });
    });

    await page.getByRole("link", { name: /ナレッジ/ }).click();
    await page.waitForURL("**/knowledge");
  });

  test("displays knowledge page heading", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: /AIナレッジベース/ })
    ).toBeVisible({ timeout: 10_000 });
  });

  test("shows knowledge article in list", async ({ page }) => {
    await expect(page.getByText("テストナレッジ記事")).toBeVisible({
      timeout: 10_000,
    });
  });
});
