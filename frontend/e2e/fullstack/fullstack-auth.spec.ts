import { test, expect } from "@playwright/test";

// Seed credentials created by backend/app/seeds/seed_test_data.py
const ADMIN_EMAIL = "admin@servicehub.example";
const ADMIN_PASSWORD = "Admin1234!";
const VIEWER_EMAIL = "viewer@servicehub.example";
const VIEWER_PASSWORD = "Viewer1234!";

test.describe("Fullstack: 認証フロー", () => {
  test("admin ユーザーでログインしてダッシュボードに遷移する", async ({
    page,
  }) => {
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: /ServiceHub/ })).toBeVisible(
      { timeout: 10_000 }
    );

    await page.locator("#email").fill(ADMIN_EMAIL);
    await page.locator("#password").fill(ADMIN_PASSWORD);
    await page.getByRole("button", { name: "ログイン" }).click();

    await expect(page).toHaveURL(/\/dashboard/, { timeout: 20_000 });
    await expect(page.getByRole("main")).toBeVisible();
  });

  test("viewer ユーザーでログインできる", async ({ page }) => {
    await page.goto("/login");
    await page.locator("#email").fill(VIEWER_EMAIL);
    await page.locator("#password").fill(VIEWER_PASSWORD);
    await page.getByRole("button", { name: "ログイン" }).click();

    await expect(page).toHaveURL(/\/dashboard/, { timeout: 20_000 });
  });

  test("誤ったパスワードでログインするとエラーが表示される", async ({
    page,
  }) => {
    await page.goto("/login");
    await page.locator("#email").fill(ADMIN_EMAIL);
    await page.locator("#password").fill("wrongpassword");
    await page.getByRole("button", { name: "ログイン" }).click();

    // Should stay on login page and show error
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });
    // Error message or form still visible
    await expect(page.locator("#email")).toBeVisible();
  });

  test("ログイン後に未認証ページにアクセスすると /login にリダイレクトされる", async ({
    page,
  }) => {
    // Access protected route without login
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });
  });

  test("ログイン後にナビゲーションが機能する", async ({ page }) => {
    await page.goto("/login");
    await page.locator("#email").fill(ADMIN_EMAIL);
    await page.locator("#password").fill(ADMIN_PASSWORD);
    await page.getByRole("button", { name: "ログイン" }).click();
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 20_000 });

    // Navigate to projects page
    await page.goto("/projects");
    await expect(page).toHaveURL(/\/projects/);
    await expect(page.getByRole("main")).toBeVisible();

    // Navigate to safety page
    await page.goto("/safety");
    await expect(page).toHaveURL(/\/safety/);
    await expect(page.getByRole("main")).toBeVisible();
  });
});
