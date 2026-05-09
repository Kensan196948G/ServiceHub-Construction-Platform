import { test, expect } from "@playwright/test";
import { loginAndNavigate } from "./fixtures/api-mocks";

test.describe("工程・スケジュールページ", () => {
  test.beforeEach(async ({ page }) => {
    await loginAndNavigate(page);
  });

  test("/schedule が h1 「工程・スケジュール」 で読み込まれる", async ({ page }) => {
    await page.goto("/schedule");
    await expect(
      page.getByRole("heading", { level: 1, name: "工程・スケジュール" })
    ).toBeVisible();
  });
});
