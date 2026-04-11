import { test, expect } from "@playwright/test";
import { loginAndNavigate } from "./fixtures/api-mocks";

test.describe("Dark Mode — Theme Toggle", () => {
  test.beforeEach(async ({ page }) => {
    await loginAndNavigate(page);
  });

  test("theme toggle button is visible in header", async ({ page }) => {
    const toggle = page.getByTestId("theme-toggle");
    await expect(toggle).toBeVisible();
  });

  test("clicking theme toggle switches to dark mode", async ({ page }) => {
    // Ensure starting in light mode
    await page.evaluate(() => localStorage.setItem("theme", "light"));
    await page.reload();

    const toggle = page.getByTestId("theme-toggle");
    // Light mode: button label should be "ダークモードに切り替え"
    await expect(toggle).toHaveAttribute("aria-label", "ダークモードに切り替え");

    await toggle.click();

    // After click: html element should have "dark" class
    const hasDark = await page.evaluate(() =>
      document.documentElement.classList.contains("dark"),
    );
    expect(hasDark).toBe(true);
    await expect(toggle).toHaveAttribute("aria-label", "ライトモードに切り替え");
  });

  test("clicking theme toggle switches from dark back to light", async ({ page }) => {
    // Start in dark mode
    await page.evaluate(() => localStorage.setItem("theme", "dark"));
    await page.reload();

    const toggle = page.getByTestId("theme-toggle");
    await expect(toggle).toHaveAttribute("aria-label", "ライトモードに切り替え");

    await toggle.click();

    const hasDark = await page.evaluate(() =>
      document.documentElement.classList.contains("dark"),
    );
    expect(hasDark).toBe(false);
    await expect(toggle).toHaveAttribute("aria-label", "ダークモードに切り替え");
  });

  test("theme persists across page reload", async ({ page }) => {
    await page.evaluate(() => localStorage.setItem("theme", "dark"));
    await page.reload();

    const hasDark = await page.evaluate(() =>
      document.documentElement.classList.contains("dark"),
    );
    expect(hasDark).toBe(true);
  });

  test("theme toggle button has correct aria-label accessible name", async ({ page }) => {
    const toggle = page.getByTestId("theme-toggle");
    const label = await toggle.getAttribute("aria-label");
    expect(["ダークモードに切り替え", "ライトモードに切り替え"]).toContain(label);
  });
});
