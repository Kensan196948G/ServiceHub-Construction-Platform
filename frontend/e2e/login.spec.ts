import { test, expect } from "@playwright/test";
import { setupAuthMocks } from './fixtures/api-mocks'

test.describe("Login Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
  });

  test("displays login form with title and inputs", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: /ServiceHub 工事管理/ })
    ).toBeVisible();
    await expect(page.getByLabel("メールアドレス")).toBeVisible();
    await expect(page.getByLabel("パスワード")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "ログイン" })
    ).toBeVisible();
  });

  test("email input has placeholder", async ({ page }) => {
    const emailInput = page.getByLabel("メールアドレス");
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
    await page.getByLabel("メールアドレス").fill("invalid@example.com");
    await page.getByLabel("パスワード").fill("wrongpassword");
    await page.getByRole("button", { name: "ログイン" }).click();

    await expect(
      page.getByText("メールアドレスまたはパスワードが正しくありません")
    ).toBeVisible({ timeout: 10_000 });
  });

  test('login success navigates to dashboard', async ({ page }) => {
    await setupAuthMocks(page)
    await page.getByLabel('メールアドレス').fill('test@example.com')
    await page.getByLabel('パスワード').fill('password123')
    await page.getByRole('button', { name: 'ログイン' }).click()
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10_000 })
  })
});
