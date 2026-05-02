import { test, expect } from "@playwright/test";
import { setupAllApiMocks } from './fixtures/api-mocks'

test.describe("Login Page", () => {
  test.beforeEach(async ({ page }) => {
    // Clear persisted auth state so unauthenticated flow is guaranteed
    await page.addInitScript(() => {
      localStorage.removeItem("servicehub-auth");
    });
    await page.goto("/login");
  });

  test("displays login form with title and inputs", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: /ServiceHub 工事管理/ })
    ).toBeVisible();
    await expect(page.getByLabel(/メールアドレス/)).toBeVisible();
    await expect(page.getByLabel(/パスワード/)).toBeVisible();
    await expect(
      page.getByRole("button", { name: "ログイン" })
    ).toBeVisible();
  });

  test("email input has placeholder", async ({ page }) => {
    const emailInput = page.getByLabel(/メールアドレス/);
    await expect(emailInput).toHaveAttribute(
      "placeholder",
      "admin@example.com"
    );
  });

  test("login button is enabled by default", async ({ page }) => {
    const button = page.getByRole("button", { name: "ログイン" });
    await expect(button).toBeEnabled();
  });

  test("redirects unauthenticated users to login", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/);
  });

  test("shows error on invalid credentials", async ({ page }) => {
    // Mock login to return network error (not 401, to avoid interceptor redirect)
    await page.route("**/api/v1/auth/login", (route) => {
      route.abort("connectionrefused");
    });

    await page.goto("/login");
    await page.locator("#email").fill("invalid@example.com");
    await page.locator("#password").fill("wrongpassword");
    await page.getByRole("button", { name: "ログイン" }).click();

    // catch block sets error message, shown via ErrorBanner (role=alert)
    await expect(
      page.getByRole("alert")
    ).toBeVisible({ timeout: 10_000 });
  });

  test('login success navigates to dashboard', async ({ page }) => {
    // Use all mocks so dashboard API calls don't return unexpected status and trigger redirect
    await setupAllApiMocks(page)
    await page.locator('#email').fill('test@example.com')
    await page.locator('#password').fill('password123')
    await page.getByRole('button', { name: 'ログイン' }).click()
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10_000 })
  })
});
