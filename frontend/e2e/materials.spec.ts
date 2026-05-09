import { test, expect } from "@playwright/test";
import { loginAndNavigate } from "./fixtures/api-mocks";

// Smoke E2E for the /materials route (materials & inventory page) introduced in PR #199 (Dashboard v2).
// Verifies the h1 heading renders. Added in PR #202 alongside three sibling page specs.
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
