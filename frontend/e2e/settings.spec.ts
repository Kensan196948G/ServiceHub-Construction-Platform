import { test, expect } from "@playwright/test";
import { loginAndNavigate, MOCK_USER } from "./fixtures/api-mocks";

/** Navigate to the settings page from sidebar. */
async function goToSettings(page: import("@playwright/test").Page) {
  await loginAndNavigate(page);

  // Mock password change endpoint
  await page.route("**/api/v1/users/me/password", (route) => {
    const method = route.request().method();
    if (method === "PATCH") {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true }),
      });
    } else {
      route.fulfill({ status: 405 });
    }
  });

  await page.getByRole("link", { name: "設定" }).click();
  await page.waitForURL("**/settings");
  await expect(page.getByRole("heading", { name: "設定", level: 1 })).toBeVisible({
    timeout: 10_000,
  });
}

test.describe("Settings Page", () => {
  test("navigates to settings via sidebar link", async ({ page }) => {
    await loginAndNavigate(page);
    await page.getByRole("link", { name: "設定" }).click();
    await page.waitForURL("**/settings");
    await expect(page.getByRole("heading", { name: "設定", level: 1 })).toBeVisible({
      timeout: 10_000,
    });
  });

  test("displays logged-in user profile information", async ({ page }) => {
    await goToSettings(page);

    // Profile section heading
    await expect(page.getByRole("heading", { name: "プロフィール" })).toBeVisible();

    // User details from MOCK_USER
    await expect(page.getByText(MOCK_USER.full_name)).toBeVisible();
    await expect(page.getByText(MOCK_USER.email)).toBeVisible();
    // Role is displayed as Japanese label "管理者" for ADMIN
    await expect(page.getByText("管理者")).toBeVisible();
  });

  test("shows password change form with required fields", async ({ page }) => {
    await goToSettings(page);

    await expect(page.getByRole("heading", { name: "パスワード変更" })).toBeVisible();
    await expect(page.getByLabel("現在のパスワード")).toBeVisible();
    await expect(page.getByLabel("新しいパスワード")).toBeVisible();
    await expect(page.getByLabel("新しいパスワード（確認）")).toBeVisible();
    await expect(page.getByRole("button", { name: "パスワードを変更" })).toBeVisible();
    await expect(page.getByRole("button", { name: "キャンセル" })).toBeVisible();
  });

  test("shows error when new passwords do not match", async ({ page }) => {
    await goToSettings(page);

    await page.getByLabel("現在のパスワード").fill("current123");
    await page.getByLabel("新しいパスワード").fill("newpass123");
    await page.getByLabel("新しいパスワード（確認）").fill("different456");

    await page.getByRole("button", { name: "パスワードを変更" }).click();

    await expect(page.getByRole("alert")).toContainText("一致しません", {
      timeout: 5_000,
    });
  });

  test("shows error when new password is too short", async ({ page }) => {
    await goToSettings(page);

    await page.getByLabel("現在のパスワード").fill("current123");
    await page.getByLabel("新しいパスワード").fill("short");
    await page.getByLabel("新しいパスワード（確認）").fill("short");

    await page.getByRole("button", { name: "パスワードを変更" }).click();

    await expect(page.getByRole("alert")).toContainText("8文字以上", { timeout: 5_000 });
  });

  test("submits password change successfully and shows success message", async ({ page }) => {
    await goToSettings(page);

    await page.getByLabel("現在のパスワード").fill("oldpassword123");
    await page.getByLabel("新しいパスワード").fill("newpassword456");
    await page.getByLabel("新しいパスワード（確認）").fill("newpassword456");

    await page.getByRole("button", { name: "パスワードを変更" }).click();

    await expect(page.getByRole("status")).toContainText("変更しました", {
      timeout: 10_000,
    });

    // Form should reset after success
    await expect(page.getByLabel("現在のパスワード")).toHaveValue("");
    await expect(page.getByLabel("新しいパスワード")).toHaveValue("");
  });

  test("cancels password change and clears form", async ({ page }) => {
    await goToSettings(page);

    await page.getByLabel("現在のパスワード").fill("mypassword");
    await page.getByLabel("新しいパスワード").fill("newpassword123");
    await page.getByLabel("新しいパスワード（確認）").fill("newpassword123");

    await page.getByRole("button", { name: "キャンセル" }).click();

    // All fields should be cleared
    await expect(page.getByLabel("現在のパスワード")).toHaveValue("");
    await expect(page.getByLabel("新しいパスワード")).toHaveValue("");
    await expect(page.getByLabel("新しいパスワード（確認）")).toHaveValue("");
  });

  test("shows error message when password change API fails", async ({ page }) => {
    await loginAndNavigate(page);

    // Override with error response
    await page.route("**/api/v1/users/me/password", (route) => {
      route.fulfill({
        status: 400,
        contentType: "application/json",
        body: JSON.stringify({ detail: "Current password is incorrect" }),
      });
    });

    await page.getByRole("link", { name: "設定" }).click();
    await page.waitForURL("**/settings");

    await page.getByLabel("現在のパスワード").fill("wrongpassword");
    await page.getByLabel("新しいパスワード").fill("newpassword456");
    await page.getByLabel("新しいパスワード（確認）").fill("newpassword456");

    await page.getByRole("button", { name: "パスワードを変更" }).click();

    await expect(page.getByRole("alert")).toContainText("失敗しました", {
      timeout: 10_000,
    });
  });
});
