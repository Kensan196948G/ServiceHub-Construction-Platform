import { test, expect } from "@playwright/test";
import { loginAndNavigate } from "./fixtures/api-mocks";

test.describe("ITSM Page", () => {
  test.beforeEach(async ({ page }) => {
    await loginAndNavigate(page);
    await page.getByRole("link", { name: /ITSM/ }).click();
    await page.waitForURL("**/itsm");
  });

  test("displays ITSM page heading", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: /ITSM/ })
    ).toBeVisible({ timeout: 10_000 });
  });

  test("has incident management tab", async ({ page }) => {
    await expect(
      page.getByText("インシデント管理")
    ).toBeVisible({ timeout: 10_000 });
  });

  test("has change request management tab", async ({ page }) => {
    await expect(
      page.getByText("変更要求管理")
    ).toBeVisible({ timeout: 10_000 });
  });
});
