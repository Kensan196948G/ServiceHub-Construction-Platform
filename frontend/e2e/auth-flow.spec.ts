import { test, expect } from "@playwright/test";
import {
  setupAuthMocks,
  setupAllApiMocks,
  MOCK_TOKEN,
  MOCK_NEW_TOKEN,
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

/** Helper: login via the actual UI flow so refreshToken is set in the in-memory Zustand store. */
async function loginViaUI(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.locator("#email").fill("test@example.com");
  await page.locator("#password").fill("password123");
  await page.getByRole("button", { name: "ログイン" }).click();
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 10_000 });
}

test.describe("Authentication Flow", () => {
  test.describe("Login — token persistence", () => {
    test("stores access_token in localStorage after login (refreshToken is memory-only)", async ({
      page,
    }) => {
      await setupAuthMocks(page);
      await loginViaUI(page);

      const state = await getAuthState(page);
      expect(state).not.toBeNull();
      expect(state!.token).toBe(MOCK_TOKEN);
      // refreshToken is NOT persisted to localStorage (security design: XSS exposure reduction)
    });

    test("persists auth state across page reload", async ({ page }) => {
      await setupAllApiMocks(page);
      await loginViaUI(page);

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
      // Set up auth mocks (login + me + refresh + logout)
      await setupAuthMocks(page);

      // Set up KPI mock: first call returns 401 (simulates expired access token),
      // subsequent calls succeed after the interceptor refreshes the token.
      // NOTE: We configure this BEFORE loginViaUI so the first dashboard kpi call
      // hits the 401 path while refreshToken is still alive in the in-memory store.
      // Using page.reload() would clear the in-memory refreshToken (memory-only by design).
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

      // Mock other APIs needed by dashboard (projects, incidents lists)
      await page.route("**/api/v1/projects**", (route) => {
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ success: true, data: [], meta: { page: 1, per_page: 20, total: 0 } }),
        });
      });
      await page.route("**/api/v1/itsm/incidents**", (route) => {
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ success: true, data: [], meta: { page: 1, per_page: 20, total: 0 } }),
        });
      });
      await page.route("**/api/v1/itsm/changes**", (route) => {
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ success: true, data: [], meta: { page: 1, per_page: 20, total: 0 } }),
        });
      });

      // Login via UI so refreshToken is in the in-memory Zustand store.
      // The first kpi call during dashboard navigation returns 401 →
      // interceptor calls /auth/refresh (gets MOCK_NEW_TOKEN) → retries kpi → 200.
      await loginViaUI(page);

      // Dashboard should still be shown after the transparent refresh+retry
      await expect(page).toHaveURL(/\/dashboard/, { timeout: 10_000 });

      // Verify access token was updated by the refresh flow
      const state = await getAuthState(page);
      expect(state!.token).toBe(MOCK_NEW_TOKEN);
    });

    test("redirects to login when refresh token is invalid", async ({
      page,
    }) => {
      // Set up login mock so in-memory refreshToken gets populated
      await setupAuthMocks(page);

      // Override refresh endpoint to fail BEFORE login so the interceptor
      // uses the real in-memory refreshToken (not null) and server rejects it.
      // NOTE: page.reload() would clear in-memory refreshToken (memory-only by design),
      // so we must trigger the 401 → refresh → 401 path during the initial navigation.
      await page.route("**/api/v1/auth/refresh", (route) => {
        route.fulfill({ status: 401, body: "Invalid refresh token" });
      });

      // KPI always returns 401 — triggers the refresh flow immediately on dashboard load
      await page.route("**/api/v1/dashboard/kpi", (route) => {
        route.fulfill({ status: 401, body: "Unauthorized" });
      });

      // Mock other dashboard APIs to avoid unrelated failures
      await page.route("**/api/v1/projects**", (route) => {
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ success: true, data: [], meta: { page: 1, per_page: 20, total: 0 } }),
        });
      });
      await page.route("**/api/v1/itsm/incidents**", (route) => {
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ success: true, data: [], meta: { page: 1, per_page: 20, total: 0 } }),
        });
      });
      await page.route("**/api/v1/itsm/changes**", (route) => {
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ success: true, data: [], meta: { page: 1, per_page: 20, total: 0 } }),
        });
      });

      // Attempt login: populates in-memory refreshToken, navigates to /dashboard,
      // kpi returns 401 → interceptor calls /auth/refresh → server returns 401 →
      // interceptor logs out and redirects to /login via window.location.href
      await page.goto("/login");
      await page.locator("#email").fill("test@example.com");
      await page.locator("#password").fill("password123");
      await page.getByRole("button", { name: "ログイン" }).click();

      // Should redirect to login after failed refresh (server rejected the refresh token)
      await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });

      // Auth state should be cleared after failed refresh
      const state = await getAuthState(page);
      expect(state!.token).toBeNull();
    });
  });

  test.describe("Logout", () => {
    test("clears auth state and redirects to login", async ({ page }) => {
      await setupAllApiMocks(page);

      // Login via UI so refreshToken is set in the in-memory store (enables server-side revocation)
      await loginViaUI(page);
      await expect(page).toHaveURL(/\/dashboard/, { timeout: 10_000 });

      // Logout button must be visible — fail the test if it is not found
      const logoutButton = page.getByRole("button", { name: /ログアウト/ });
      await expect(logoutButton).toBeVisible({ timeout: 10_000 });
      await logoutButton.click();

      // Should redirect to login
      await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });

      // Auth state should be cleared
      const state = await getAuthState(page);
      expect(state!.token).toBeNull();
    });

    test("logout succeeds even when access token is expired", async ({ page }) => {
      await setupAllApiMocks(page);

      // Login via UI to get refreshToken in memory
      await loginViaUI(page);
      await expect(page).toHaveURL(/\/dashboard/, { timeout: 10_000 });

      // Simulate expired access token in localStorage (in-memory store still has refreshToken)
      await page.evaluate(() => {
        const raw = localStorage.getItem("servicehub-auth");
        if (raw) {
          const parsed = JSON.parse(raw);
          parsed.state.token = "expired-token";
          localStorage.setItem("servicehub-auth", JSON.stringify(parsed));
        }
      });

      // logout endpoint is auth-free — should succeed regardless of access token validity.
      // NOTE: We do NOT reload here; page.reload() would clear the in-memory refreshToken
      // (memory-only by security design) and the logout call would have no token to revoke.
      const logoutButton = page.getByRole("button", { name: /ログアウト/ });
      await expect(logoutButton).toBeVisible({ timeout: 10_000 });
      await logoutButton.click();
      await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });

      // Auth state should be cleared
      const state = await getAuthState(page);
      expect(state!.token).toBeNull();
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
        route.fulfill({ status: 401, body: "Unauthorized" });
      });

      await page.goto("/dashboard");
      await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });
    });
  });
});

