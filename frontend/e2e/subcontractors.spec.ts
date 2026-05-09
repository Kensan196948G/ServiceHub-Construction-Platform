import { test, expect } from "@playwright/test";
import { loginAndNavigate } from "./fixtures/api-mocks";

test.describe("協力会社・職人ページ", () => {
  test.beforeEach(async ({ page }) => {
    await loginAndNavigate(page);
  });

  test("/subcontractors が h1 「協力会社・職人」 で読み込まれる", async ({ page }) => {
    await page.goto("/subcontractors");
    await expect(
      page.getByRole("heading", { level: 1, name: "協力会社・職人" })
    ).toBeVisible();
  });
});
