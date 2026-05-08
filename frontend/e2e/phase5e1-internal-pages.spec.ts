import { test, expect } from "@playwright/test";
import { loginAndNavigate } from "./fixtures/api-mocks";

test.describe("現場・取引グループ 4 ページ smoke", () => {
  test("工程・スケジュール: 見出しが表示される", async ({ page }) => {
    await loginAndNavigate(page);
    await page.goto("/schedule");
    await expect(page.getByRole("heading", { name: "工程・スケジュール", level: 1 })).toBeVisible({
      timeout: 10_000,
    });
  });

  test("資材・在庫: 見出しが表示される", async ({ page }) => {
    await loginAndNavigate(page);
    await page.goto("/materials");
    await expect(page.getByRole("heading", { name: "資材・在庫", level: 1 })).toBeVisible({
      timeout: 10_000,
    });
  });

  test("協力会社・職人: 見出しが表示される", async ({ page }) => {
    await loginAndNavigate(page);
    await page.goto("/subcontractors");
    await expect(page.getByRole("heading", { name: "協力会社・職人", level: 1 })).toBeVisible({
      timeout: 10_000,
    });
  });

  test("見積・請求: 見出しが表示される", async ({ page }) => {
    await loginAndNavigate(page);
    await page.goto("/estimates");
    await expect(page.getByRole("heading", { name: "見積・請求", level: 1 })).toBeVisible({
      timeout: 10_000,
    });
  });
});
