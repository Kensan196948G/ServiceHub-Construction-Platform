import { test, expect } from "@playwright/test";
import { loginAndNavigate } from "./fixtures/api-mocks";

const MOCK_USERS = [
  {
    id: "1",
    email: "admin@example.com",
    full_name: "管理者ユーザー",
    role: "ADMIN",
    is_active: true,
    last_login_at: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  },
  {
    id: "2",
    email: "viewer@example.com",
    full_name: "閲覧者ユーザー",
    role: "VIEWER",
    is_active: false,
    last_login_at: null,
    created_at: "2026-02-01T00:00:00Z",
    updated_at: "2026-02-01T00:00:00Z",
  },
];

const MOCK_USERS_RESPONSE = {
  success: true,
  data: MOCK_USERS,
  meta: { page: 1, per_page: 20, total: 2, pages: 1 },
};

test.describe("Users CRUD", () => {
  test.beforeEach(async ({ page }) => {
    await loginAndNavigate(page);

    // Override the users API mock set in loginAndNavigate
    await page.route("**/api/v1/users**", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(MOCK_USERS_RESPONSE),
      });
    });

    await page.goto("/users");
    await page.waitForURL("**/users");
    // Wait for user list to load
    await expect(page.getByText("管理者ユーザー")).toBeVisible({
      timeout: 10_000,
    });
  });

  // ─── Create ───────────────────────────────────────────

  test("cancel button closes create modal", async ({ page }) => {
    await page.getByRole("button", { name: /新規ユーザー作成/ }).click();
    await expect(
      page.getByRole("heading", { name: /新規ユーザー作成/ })
    ).toBeVisible({ timeout: 5_000 });

    await page.getByRole("button", { name: "キャンセル" }).click();

    await expect(
      page.getByRole("heading", { name: /新規ユーザー作成/ })
    ).not.toBeVisible();
  });

  test("create button disabled until required fields filled", async ({
    page,
  }) => {
    await page.getByRole("button", { name: /新規ユーザー作成/ }).click();
    await expect(
      page.getByRole("heading", { name: /新規ユーザー作成/ })
    ).toBeVisible({ timeout: 5_000 });

    // Submit button should be disabled initially (email and full_name empty, password too short)
    const submitButton = page.getByRole("button", { name: "作成" });
    await expect(submitButton).toBeDisabled();

    // Fill email only — still disabled
    await page.locator("#create-email").fill("new@example.com");
    await expect(submitButton).toBeDisabled();

    // Fill full_name — still disabled (password too short)
    await page.locator("#create-name").fill("新規テストユーザー");
    await expect(submitButton).toBeDisabled();

    // Fill password (8+ chars) — now enabled
    await page.locator("#create-password").fill("password123");
    await expect(submitButton).toBeEnabled();
  });

  test("creates user successfully and closes modal", async ({ page }) => {
    const newUser = {
      id: "3",
      email: "new@example.com",
      full_name: "新規テストユーザー",
      role: "VIEWER",
      is_active: true,
      last_login_at: null,
      created_at: "2026-04-09T00:00:00Z",
      updated_at: "2026-04-09T00:00:00Z",
    };

    // Mock POST for creation, then refresh GET
    await page.route("**/api/v1/users**", (route) => {
      if (route.request().method() === "POST") {
        route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify({ success: true, data: newUser }),
        });
      } else {
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            ...MOCK_USERS_RESPONSE,
            data: [...MOCK_USERS, newUser],
            meta: { ...MOCK_USERS_RESPONSE.meta, total: 3 },
          }),
        });
      }
    });

    await page.getByRole("button", { name: /新規ユーザー作成/ }).click();
    await expect(
      page.getByRole("heading", { name: /新規ユーザー作成/ })
    ).toBeVisible({ timeout: 5_000 });

    await page.locator("#create-email").fill("new@example.com");
    await page.locator("#create-name").fill("新規テストユーザー");
    await page.locator("#create-password").fill("password123");

    await page.getByRole("button", { name: "作成" }).click();

    // Modal should close on success
    await expect(
      page.getByRole("heading", { name: /新規ユーザー作成/ })
    ).not.toBeVisible({ timeout: 5_000 });
  });

  // ─── Edit ─────────────────────────────────────────────

  test("opens edit modal for a user", async ({ page }) => {
    // Click edit for the second user (閲覧者ユーザー)
    const rows = page.locator("tbody tr");
    const secondRow = rows.nth(1);
    await secondRow.getByRole("button", { name: "編集" }).click();

    await expect(
      page.getByRole("heading", { name: /ユーザー編集/ })
    ).toBeVisible({ timeout: 5_000 });

    // Edit modal shows the user's email
    await expect(page.getByText("viewer@example.com")).toBeVisible();
  });

  test("saves role change and closes edit modal", async ({ page }) => {
    // Mock PATCH/PUT for update
    await page.route("**/api/v1/users/**", (route) => {
      if (
        route.request().method() === "PATCH" ||
        route.request().method() === "PUT"
      ) {
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            data: { ...MOCK_USERS[1], role: "PROJECT_MANAGER", is_active: true },
          }),
        });
      } else {
        route.continue();
      }
    });

    const rows = page.locator("tbody tr");
    const secondRow = rows.nth(1);
    await secondRow.getByRole("button", { name: "編集" }).click();
    await expect(
      page.getByRole("heading", { name: /ユーザー編集/ })
    ).toBeVisible({ timeout: 5_000 });

    // Change role
    await page.locator("#edit-role").selectOption("PROJECT_MANAGER");

    await page.getByRole("button", { name: "保存" }).click();

    // Modal should close on success
    await expect(
      page.getByRole("heading", { name: /ユーザー編集/ })
    ).not.toBeVisible({ timeout: 5_000 });
  });

  test("cancel button closes edit modal", async ({ page }) => {
    const rows = page.locator("tbody tr");
    await rows.nth(1).getByRole("button", { name: "編集" }).click();
    await expect(
      page.getByRole("heading", { name: /ユーザー編集/ })
    ).toBeVisible({ timeout: 5_000 });

    await page.getByRole("button", { name: "キャンセル" }).click();

    await expect(
      page.getByRole("heading", { name: /ユーザー編集/ })
    ).not.toBeVisible();
  });

  // ─── Delete ───────────────────────────────────────────

  test("delete user with confirmation", async ({ page }) => {
    // Mock DELETE endpoint
    await page.route("**/api/v1/users/**", (route) => {
      if (route.request().method() === "DELETE") {
        route.fulfill({ status: 204 });
      } else {
        route.continue();
      }
    });

    // Handle the confirm dialog — accept it
    page.on("dialog", (dialog) => dialog.accept());

    const rows = page.locator("tbody tr");
    const secondRow = rows.nth(1);
    await secondRow.getByRole("button", { name: "削除" }).click();

    // After dialog accept, DELETE is fired — no error shown
    // (list refresh would happen; for this test we just verify no crash)
    await expect(page.getByText("閲覧者ユーザー")).toBeVisible();
  });

  test("cancel delete keeps user in list", async ({ page }) => {
    // Handle the confirm dialog — dismiss it
    page.on("dialog", (dialog) => dialog.dismiss());

    const rows = page.locator("tbody tr");
    await rows.nth(1).getByRole("button", { name: "削除" }).click();

    // User should still be visible after cancel
    await expect(page.getByText("閲覧者ユーザー")).toBeVisible();
  });

  // ─── Status badges ────────────────────────────────────

  test("shows active and inactive status badges", async ({ page }) => {
    // User 1 is active → 有効, User 2 is inactive → 無効
    await expect(page.getByText("有効")).toBeVisible();
    await expect(page.getByText("無効")).toBeVisible();
  });

  test("shows role badges for users", async ({ page }) => {
    await expect(page.getByText("ADMIN")).toBeVisible();
    await expect(page.getByText("VIEWER")).toBeVisible();
  });

  // ─── Access control ───────────────────────────────────

  test("non-admin user sees access denied message", async ({ page }) => {
    // Set a non-admin user in localStorage
    await page.evaluate(() => {
      const authState = JSON.parse(
        localStorage.getItem("servicehub-auth") ?? "{}"
      );
      authState.state.user = {
        id: 99,
        email: "viewer@example.com",
        full_name: "閲覧専用ユーザー",
        role: "VIEWER",
        is_active: true,
      };
      localStorage.setItem("servicehub-auth", JSON.stringify(authState));
    });

    // Reload to apply the new user state
    await page.reload();
    await page.waitForURL("**/users");

    await expect(
      page.getByText("このページはADMINのみアクセス可能です。")
    ).toBeVisible({ timeout: 10_000 });
  });
});
