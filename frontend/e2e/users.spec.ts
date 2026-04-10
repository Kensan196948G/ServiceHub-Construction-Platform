import { test, expect } from "@playwright/test";
import { loginAndNavigate } from "./fixtures/api-mocks";

const MOCK_USERS = [
  {
    id: "u-1",
    email: "admin@example.com",
    full_name: "管理者太郎",
    role: "ADMIN",
    is_active: true,
    last_login_at: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  },
  {
    id: "u-2",
    email: "pm@example.com",
    full_name: "山田次郎",
    role: "PROJECT_MANAGER",
    is_active: true,
    last_login_at: "2026-04-09T08:00:00Z",
    created_at: "2026-02-01T00:00:00Z",
    updated_at: "2026-04-09T08:00:00Z",
  },
  {
    id: "u-3",
    email: "inactive@example.com",
    full_name: "無効ユーザー花子",
    role: "VIEWER",
    is_active: false,
    last_login_at: null,
    created_at: "2026-03-01T00:00:00Z",
    updated_at: "2026-03-01T00:00:00Z",
  },
];

/** Navigate to users page with users list mocked. */
async function setupUsersPage(page: import("@playwright/test").Page) {
  await loginAndNavigate(page);

  // Mock users list API (ADMIN-only endpoint)
  await page.route("**/api/v1/users**", (route) => {
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        data: MOCK_USERS,
        meta: { page: 1, per_page: 20, total: 3, pages: 1 },
      }),
    });
  });

  // Navigate via ADMIN-only sidebar link
  await page.getByRole("link", { name: "ユーザー管理", exact: true }).click();
  await page.waitForURL("**/users");
}

test.describe("Users Page", () => {
  test("displays page heading", async ({ page }) => {
    await setupUsersPage(page);
    await expect(
      page.getByRole("heading", { name: "ユーザー管理" })
    ).toBeVisible({ timeout: 10_000 });
  });

  test("shows 新規ユーザー作成 button", async ({ page }) => {
    await setupUsersPage(page);
    await expect(
      page.getByRole("button", { name: "新規ユーザー作成" })
    ).toBeVisible({ timeout: 10_000 });
  });

  test("displays user names and emails in table", async ({ page }) => {
    await setupUsersPage(page);
    await expect(page.getByText("管理者太郎")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("admin@example.com")).toBeVisible();
    await expect(page.getByText("山田次郎")).toBeVisible();
    await expect(page.getByText("pm@example.com")).toBeVisible();
  });

  test("shows ADMIN role badge", async ({ page }) => {
    await setupUsersPage(page);
    await expect(page.getByText("管理者太郎")).toBeVisible({ timeout: 10_000 });
    // ADMIN badge (rendered with danger variant)
    await expect(page.getByText("ADMIN").first()).toBeVisible();
  });

  test("shows PROJECT_MANAGER role badge", async ({ page }) => {
    await setupUsersPage(page);
    await expect(page.getByText("山田次郎")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("PROJECT_MANAGER")).toBeVisible();
  });

  test("shows 有効 status badge for active users", async ({ page }) => {
    await setupUsersPage(page);
    await expect(page.getByText("管理者太郎")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("有効").first()).toBeVisible();
  });

  test("shows 無効 status badge for inactive users", async ({ page }) => {
    await setupUsersPage(page);
    await expect(page.getByText("無効ユーザー花子")).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.getByText("無効", { exact: true })).toBeVisible();
  });

  test("shows 編集 button for each user row", async ({ page }) => {
    await setupUsersPage(page);
    await expect(page.getByText("管理者太郎")).toBeVisible({ timeout: 10_000 });
    await expect(
      page.getByRole("button", { name: "編集" }).first()
    ).toBeVisible();
  });

  test("opens create modal when 新規ユーザー作成 clicked", async ({ page }) => {
    await setupUsersPage(page);
    await page.getByRole("button", { name: "新規ユーザー作成" }).click();
    // Modal should appear with correct title and form fields
    await expect(
      page.getByRole("dialog").getByText("新規ユーザー作成")
    ).toBeVisible({ timeout: 10_000 });
    await expect(page.getByLabel("メールアドレス")).toBeVisible();
    await expect(page.getByLabel("氏名")).toBeVisible();
  });

  test("opens edit modal when 編集 clicked", async ({ page }) => {
    await setupUsersPage(page);
    await expect(page.getByText("管理者太郎")).toBeVisible({ timeout: 10_000 });
    // Click the first 編集 button
    await page.getByRole("button", { name: "編集" }).first().click();
    await expect(
      page.getByRole("dialog").getByText("ユーザー編集")
    ).toBeVisible({ timeout: 10_000 });
  });

  test("shows access restriction for non-ADMIN users", async ({ page }) => {
    // Set VIEWER role in localStorage before navigating to users page
    await page.goto("/login");
    await page.evaluate(() => {
      localStorage.setItem(
        "servicehub-auth",
        JSON.stringify({
          state: {
            token: "mock-jwt-token-for-testing",
            refreshToken: "mock-refresh-token-for-testing",
            user: {
              id: 99,
              email: "viewer@example.com",
              full_name: "一般ユーザー",
              role: "VIEWER",
              is_active: true,
            },
          },
          version: 0,
        })
      );
    });
    await page.goto("/users");
    await expect(
      page.getByText("このページはADMINのみアクセス可能です。")
    ).toBeVisible({ timeout: 10_000 });
  });

  test("shows empty table when no users exist", async ({ page }) => {
    await loginAndNavigate(page);

    // Override with empty user list
    await page.route("**/api/v1/users**", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: [],
          meta: { page: 1, per_page: 20, total: 0, pages: 0 },
        }),
      });
    });

    await page.getByRole("link", { name: "ユーザー管理", exact: true }).click();
    await page.waitForURL("**/users");

    // Page heading still visible, user names not present
    await expect(
      page.getByRole("heading", { name: "ユーザー管理" })
    ).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("管理者太郎")).not.toBeVisible();
  });
});
