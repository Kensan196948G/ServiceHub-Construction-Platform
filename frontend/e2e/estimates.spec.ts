import { test, expect } from "@playwright/test";
import { loginAndNavigate } from "./fixtures/api-mocks";

test.describe("見積・請求ページ", () => {
  test.beforeEach(async ({ page }) => {
    await loginAndNavigate(page);
  });

  test("/estimates が h1 「見積・請求」 で読み込まれる", async ({ page }) => {
    await page.goto("/estimates");
    await expect(
      page.getByRole("heading", { level: 1, name: "見積・請求" })
    ).toBeVisible();
  });
});
