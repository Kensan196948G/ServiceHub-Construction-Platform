import { test, expect } from "@playwright/test";
import { loginAndNavigate } from "./fixtures/api-mocks";

test.describe("資材・在庫ページ", () => {
  test.beforeEach(async ({ page }) => {
    await loginAndNavigate(page);
  });

  test("/materials が h1 「資材・在庫」 で読み込まれる", async ({ page }) => {
    await page.goto("/materials");
    await expect(
      page.getByRole("heading", { level: 1, name: "資材・在庫" })
    ).toBeVisible();
  });
});
