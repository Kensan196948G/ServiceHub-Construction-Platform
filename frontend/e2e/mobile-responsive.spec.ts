import { test, expect } from "@playwright/test";
import { loginAndNavigate } from "./fixtures/api-mocks";

// Mobile viewport: iPhone SE (375x667)
const MOBILE_VIEWPORT = { width: 375, height: 667 };

test.describe("Mobile Responsive — Layout & Navigation", () => {
  test.use({ viewport: MOBILE_VIEWPORT });

  test.beforeEach(async ({ page }) => {
    await loginAndNavigate(page);
  });

  test("hamburger menu button is visible on mobile", async ({ page }) => {
    const hamburgerBtn = page.getByRole("button", { name: "メニューを開く" });
    await expect(hamburgerBtn).toBeVisible();
  });

  test("sidebar is hidden by default on mobile", async ({ page }) => {
    // Sidebar nav links should not be visible (sidebar is off-screen)
    const sidebar = page.locator("aside");
    // The sidebar exists in DOM but is translated off-screen — check nav is not interactive
    await expect(sidebar).toHaveClass(/-translate-x-full/);
  });

  test("hamburger button opens the sidebar", async ({ page }) => {
    const hamburgerBtn = page.getByRole("button", { name: "メニューを開く" });
    await hamburgerBtn.click();

    // After click, sidebar should be visible (translate-x-0)
    const sidebar = page.locator("aside");
    await expect(sidebar).toHaveClass(/translate-x-0/);

    // Close button should now be visible
    const closeBtn = page.getByRole("button", { name: "メニューを閉じる" });
    await expect(closeBtn).toBeVisible();
  });

  test("sidebar nav links are accessible after opening menu", async ({
    page,
  }) => {
    const hamburgerBtn = page.getByRole("button", { name: "メニューを開く" });
    await hamburgerBtn.click();

    // Sidebar nav links should be reachable
    const nav = page.getByRole("navigation", { name: "メインナビゲーション" });
    await expect(nav).toBeVisible();
    await expect(nav.getByRole("link", { name: "ダッシュボード" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "工事案件" })).toBeVisible();
  });

  test("clicking a nav link closes the sidebar", async ({ page }) => {
    const hamburgerBtn = page.getByRole("button", { name: "メニューを開く" });
    await hamburgerBtn.click();

    const nav = page.getByRole("navigation", { name: "メインナビゲーション" });
    await nav.getByRole("link", { name: "工事案件" }).click();
    await page.waitForURL("**/projects");

    // After navigation, sidebar should be closed again
    const sidebar = page.locator("aside");
    await expect(sidebar).toHaveClass(/-translate-x-full/);
  });

  test("overlay appears when sidebar is open and closes on click", async ({
    page,
  }) => {
    const hamburgerBtn = page.getByRole("button", { name: "メニューを開く" });
    await hamburgerBtn.click();

    // Click overlay (outside sidebar)
    await page.locator('[aria-hidden="true"].fixed.inset-0').click();

    const sidebar = page.locator("aside");
    await expect(sidebar).toHaveClass(/-translate-x-full/);
  });
});

test.describe("Mobile Responsive — Dashboard", () => {
  test.use({ viewport: MOBILE_VIEWPORT });

  test.beforeEach(async ({ page }) => {
    await loginAndNavigate(page);
  });

  test("KPI stat cards render on mobile viewport", async ({ page }) => {
    await expect(page.getByText("工事案件数 (合計)")).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.getByText("進行中インシデント")).toBeVisible();
  });

  test("page does not have horizontal overflow on mobile", async ({ page }) => {
    // Check that body width does not exceed viewport width
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    expect(bodyWidth).toBeLessThanOrEqual(MOBILE_VIEWPORT.width);
  });
});

test.describe("Mobile Responsive — Projects Page", () => {
  test.use({ viewport: MOBILE_VIEWPORT });

  test.beforeEach(async ({ page }) => {
    await loginAndNavigate(page);
    await page.goto("/projects");
    await page.waitForURL("**/projects");
  });

  test("projects table renders on mobile", async ({ page }) => {
    await expect(page.getByRole("table", { name: "工事案件一覧" })).toBeVisible({
      timeout: 10_000,
    });
  });

  test("search input is accessible on mobile", async ({ page }) => {
    const searchInput = page.getByRole("textbox", { name: "工事案件を検索" });
    await expect(searchInput).toBeVisible();
    await searchInput.fill("テスト");
    await expect(searchInput).toHaveValue("テスト");
  });
});

test.describe("Accessibility — ARIA Attributes", () => {
  test.use({ viewport: MOBILE_VIEWPORT });

  test.beforeEach(async ({ page }) => {
    await loginAndNavigate(page);
  });

  test("hamburger button has correct aria-expanded state", async ({ page }) => {
    const hamburgerBtn = page.getByRole("button", { name: "メニューを開く" });
    await expect(hamburgerBtn).toHaveAttribute("aria-expanded", "false");

    await hamburgerBtn.click();

    const closeBtn = page.getByRole("button", { name: "メニューを閉じる" });
    await expect(closeBtn).toHaveAttribute("aria-expanded", "true");
  });

  test("hamburger button has aria-controls pointing to sidebar nav", async ({
    page,
  }) => {
    const hamburgerBtn = page.getByRole("button", { name: "メニューを開く" });
    await expect(hamburgerBtn).toHaveAttribute("aria-controls", "sidebar-nav");

    // Verify the target element exists
    await expect(page.locator("#sidebar-nav")).toBeAttached();
  });

  test("active nav link has aria-current=page", async ({ page }) => {
    const hamburgerBtn = page.getByRole("button", { name: "メニューを開く" });
    await hamburgerBtn.click();

    const dashboardLink = page
      .getByRole("navigation", { name: "メインナビゲーション" })
      .getByRole("link", { name: "ダッシュボード" });
    await expect(dashboardLink).toHaveAttribute("aria-current", "page");
  });

  test("sidebar landmark has accessible label", async ({ page }) => {
    const sidebar = page.getByRole("complementary", {
      name: "サイドバーナビゲーション",
    });
    await expect(sidebar).toBeAttached();
  });
});
