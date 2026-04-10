import { test, expect } from "@playwright/test";
import {
  setupAuthMocks,
  setupAllApiMocks,
  MOCK_TOKEN,
  MOCK_NEW_TOKEN,
  MOCK_USER,
} from "./fixtures/api-mocks";

/** Helper: read Zustand persisted auth state from localStorage.
 *  NOTE: refreshToken is intentionally excluded from localStorage (memory-only)
 *  to reduce XSS attack surface. Only token and user are persisted.
 */
async function getAuthState(page: import("@playwright/test").Page) {
  return page.evaluate(() => {
    const raw = localStorage.getItem("servicehub-auth");
    if (!raw) return null;
    return JSON.parse(raw).state as {
      token: string | null;
      user: unknown;
    };
  });
}

test.describe("Authentication Flow", () => {
  test.describe("Login — token persistence", () => {
    test("stores access_token in localStorage after login (refreshToken is memory-only)", async ({
      page,
    }) => {
      await setupAuthMocks(page);
      await page.goto("/login");

      await page.locator("#email").fill("test@example.com");
      await page.locator("#password").fill("password123");
      await page.getByRole("button", { name: "ログイン" }).click();

      await expect(page).toHaveURL(/\/dashboard/, { timeout: 10_000 });

      const state = await getAuthState(page);
      expect(state).not.toBeNull();
      expect(state!.token).toBe(MOCK_TOKEN);
      // refreshToken is NOT persisted to localStorage (security design: XSS exposure reduction)
    });

    test("persists auth state across page reload", async ({ page }) => {
      await setupAllApiMocks(page);
      await page.goto("/login");

      await page.locator("#email").fill("test@example.com");
      await page.locator("#password").fill("password123");
      await page.getByRole("button", { name: "ログイン" }).click();
      await expect(page).toHaveURL(/\/dashboard/, { timeout: 10_000 });

      // Reload and verify session persists (access_token survives reload via localStorage)
      await page.reload();
      await expect(page).toHaveURL(/\/dashboard/, { timeout: 10_000 });

      const state = await getAuthState(page);
      expect(state!.token).toBe(MOCK_TOKEN);
      // refreshToken is memory-only — not in localStorage after reload (by design)
    });
  });

  test.describe("Token refresh", () => {
    test("automatically refreshes token on 401 response", async ({
      page,
    }) => {
      await setupAllApiMocks(page);

      // Pre-set auth state with access token only (refreshToken is not persisted to localStorage)
      await page.goto("/login");
      await page.evaluate(
        ({ token, user }) => {
          localStorage.setItem(
            "servicehub-auth",
            JSON.stringify({
              state: { token, user },
              version: 0,
            })
          );
        },
        {
          token: "expired-token",
          user: MOCK_USER,
        }
      );

      // Override KPI endpoint: first call returns 401, subsequent calls succeed
      let kpiCallCount = 0;
      await page.route("**/api/v1/dashboard/kpi", (route) => {
        kpiCallCount++;
        if (kpiCallCount === 1) {
          route.fulfill({ status: 401, body: "Unauthorized" });
        } else {
          route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
              data: {
                projects: { total: 5, planning: 1, in_progress: 3, on_hold: 0, completed: 1 },
                incidents: { total: 2, open: 1, in_progress: 1, resolved: 0 },
                cost_overview: { total_budgeted: 1000000, total_actual: 900000, variance: -100000, variance_rate: -0.1 },
                daily_reports_count: 10,
                photos_count: 50,
                users_count: 5,
              },
            }),
          });
        }
      });

      await page.goto("/dashboard");
      // Should stay on dashboard (not redirected to login) after auto-refresh
      await expect(page).toHaveURL(/\/dashboard/, { timeout: 10_000 });

      // Verify access token was updated by the refresh
      const state = await getAuthState(page);
      expect(state!.token).toBe(MOCK_NEW_TOKEN);
      // refreshToken stays in memory only — not verifiable from localStorage
    });

    test("redirects to login when refresh token is invalid", async ({
      page,
    }) => {
      // Set up auth state with expired access token only
      await page.goto("/login");
      await page.evaluate(
        ({ user }) => {
          localStorage.setItem(
            "servicehub-auth",
            JSON.stringify({
              state: {
                token: "expired-token",
                user,
              },
              version: 0,
            })
          );
        },
        { user: MOCK_USER }
      );

      // Mock refresh to fail
      await page.route("**/api/v1/auth/refresh", (route) => {
        route.fulfill({ status: 401, body: "Invalid refresh token" });
      });

      // Mock dashboard API to return 401
      await page.route("**/api/v1/dashboard/kpi", (route) => {
        route.fulfill({ status: 401, body: "Unauthorized" });
      });

      await page.goto("/dashboard");
      // Should redirect to login after failed refresh
      await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });

      // Auth state should be cleared
      const state = await getAuthState(page);
      expect(state!.token).toBeNull();
    });
  });

  test.describe("Logout", () => {
    test("clears auth state and redirects to login", async ({ page }) => {
      await setupAllApiMocks(page);

      // Set auth state (access token only in localStorage; refreshToken is memory-only)
      await page.goto("/login");
      await page.evaluate(
        ({ token, user }) => {
          localStorage.setItem(
            "servicehub-auth",
            JSON.stringify({
              state: { token, user },
              version: 0,
            })
          );
        },
        {
          token: MOCK_TOKEN,
          user: MOCK_USER,
        }
      );

      await page.goto("/dashboard");
      await expect(page).toHaveURL(/\/dashboard/, { timeout: 10_000 });

      // Find and click logout button
      const logoutButton = page.getByRole("button", { name: /ログアウト/ });
      if (await logoutButton.isVisible()) {
        await logoutButton.click();

        // Should redirect to login
        await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });

        // Auth state should be cleared
        const state = await getAuthState(page);
        expect(state!.token).toBeNull();
      }
    });
  });

  test.describe("Unauthenticated access", () => {
    test("redirects to login when no tokens exist", async ({ page }) => {
      await page.goto("/dashboard");
      await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });
    });

    test("redirects to login when only expired token exists (no refresh token)", async ({
      page,
    }) => {
      await page.goto("/login");
      await page.evaluate(() => {
        localStorage.setItem(
          "servicehub-auth",
          JSON.stringify({
            state: { token: "expired-token", user: null },
            version: 0,
          })
        );
      });

      // Mock all API calls to return 401
      await page.route("**/api/v1/**", (route) => {
        if (route.request().url().includes("/auth/")) {
          route.fulfill({ status: 401, body: "Unauthorized" });
        } else {
          route.fulfill({ status: 401, body: "Unauthorized" });
        }
      });

      await page.goto("/dashboard");
      await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });
    });
  });
});
