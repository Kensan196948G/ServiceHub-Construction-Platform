import { test, expect } from "@playwright/test";
import { loginAndNavigate } from "./fixtures/api-mocks";

/**
 * Trigger the ErrorBoundary that wraps <Outlet /> in Layout by directly
 * calling setState on its React class instance via the internal __reactFiber
 * property. This avoids adding test-only code to production components.
 *
 * Note: ErrorBoundary is a CHILD of <main> in the DOM tree, so we walk DOWN
 * via .child/.sibling rather than UP via .return.
 * This relies on React 18 internals (stable across patch versions).
 */
async function triggerErrorBoundary(page: import("@playwright/test").Page, message = "テストエラー") {
  await page.evaluate((msg) => {
    const main = document.querySelector("main");
    if (!main) throw new Error("main element not found");

    const fiberKey = Object.keys(main).find((k) => k.startsWith("__reactFiber"));
    if (!fiberKey) throw new Error("React fiber not found on main");

    // ErrorBoundary is a descendant of <main>, so walk DOWN through the fiber tree
    type Fiber = {
      type?: { name?: string };
      stateNode?: { setState?: (s: unknown) => void; state?: { hasError?: boolean } };
      child?: Fiber | null;
      sibling?: Fiber | null;
    };

    function findAndTrigger(fiber: Fiber | null): boolean {
      if (!fiber) return false;
      // Match by component name (preserved in Vite dev mode)
      if (fiber.type?.name === "ErrorBoundary" && fiber.stateNode?.setState) {
        fiber.stateNode.setState({ hasError: true, error: new Error(msg) });
        return true;
      }
      return findAndTrigger(fiber.child ?? null) || findAndTrigger(fiber.sibling ?? null);
    }

    const mainFiber = (main as Record<string, unknown>)[fiberKey] as Fiber;
    // Start from the first child of <main> (which should be ErrorBoundary or contain it)
    if (!findAndTrigger(mainFiber.child ?? null)) {
      throw new Error("ErrorBoundary not found in fiber tree");
    }
  }, message);
}

test.describe("ErrorBoundary", () => {
  test("does not show fallback on normal dashboard navigation", async ({ page }) => {
    await loginAndNavigate(page);
    // Fallback element should NOT be present during normal operation
    await expect(page.getByTestId("error-boundary-fallback")).not.toBeVisible({ timeout: 5_000 });
  });

  test("shows fallback UI when a render error is thrown", async ({ page }) => {
    await loginAndNavigate(page);

    await triggerErrorBoundary(page, "テスト用のレンダーエラー");

    // Fallback UI should appear
    await expect(page.getByTestId("error-boundary-fallback")).toBeVisible({ timeout: 5_000 });
    await expect(page.getByRole("alert")).toContainText("予期しないエラーが発生しました");
    await expect(page.getByRole("alert")).toContainText("テスト用のレンダーエラー");
  });

  test("shows retry button in fallback UI", async ({ page }) => {
    await loginAndNavigate(page);
    await triggerErrorBoundary(page);

    await expect(page.getByRole("button", { name: "再試行" })).toBeVisible({ timeout: 5_000 });
  });

  test("clicking retry resets the boundary and shows normal content", async ({ page }) => {
    await loginAndNavigate(page);
    await triggerErrorBoundary(page);

    await expect(page.getByTestId("error-boundary-fallback")).toBeVisible({ timeout: 5_000 });

    // Clicking retry should reset the boundary
    await page.getByRole("button", { name: "再試行" }).click();

    // Fallback should disappear; normal dashboard content should return
    await expect(page.getByTestId("error-boundary-fallback")).not.toBeVisible({ timeout: 5_000 });
  });

  test("sidebar navigation still works after boundary is reset", async ({ page }) => {
    await loginAndNavigate(page);
    await triggerErrorBoundary(page);

    await page.getByRole("button", { name: "再試行" }).click();
    await expect(page.getByTestId("error-boundary-fallback")).not.toBeVisible({ timeout: 5_000 });

    // Can still navigate to other pages
    await page.getByRole("link", { name: "設定" }).click();
    await page.waitForURL("**/settings");
    await expect(page.getByRole("heading", { name: "設定", level: 1 })).toBeVisible({
      timeout: 10_000,
    });
  });
});
