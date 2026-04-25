import { test, expect, Page } from "@playwright/test";

const ADMIN_EMAIL = "admin@servicehub.example";
const ADMIN_PASSWORD = "Admin1234!";

async function loginAsAdmin(page: Page): Promise<void> {
  await page.goto("/login");
  await page.locator("#email").fill(ADMIN_EMAIL);
  await page.locator("#password").fill(ADMIN_PASSWORD);
  await page.getByRole("button", { name: "ログイン" }).click();
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 20_000 });
}

test.describe("Fullstack: ダッシュボード・ページ表示", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test("ダッシュボードが表示される", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page.getByRole("main")).toBeVisible({ timeout: 15_000 });
    // Dashboard should contain some content (no network error)
    await expect(page.locator("body")).not.toContainText("Network Error");
    await expect(page.locator("body")).not.toContainText("500");
  });

  test("工事案件一覧ページが表示される", async ({ page }) => {
    await page.goto("/projects");
    await expect(page.getByRole("main")).toBeVisible({ timeout: 15_000 });
    // Page loaded without error
    await expect(page.locator("body")).not.toContainText("Network Error");
  });

  test("安全点検ページが表示される", async ({ page }) => {
    await page.goto("/safety");
    await expect(page.getByRole("main")).toBeVisible({ timeout: 15_000 });
    await expect(page.locator("body")).not.toContainText("Network Error");
  });

  test("原価管理ページが表示される", async ({ page }) => {
    await page.goto("/cost");
    await expect(page.getByRole("main")).toBeVisible({ timeout: 15_000 });
    await expect(page.locator("body")).not.toContainText("Network Error");
  });

  test("写真管理ページが表示される", async ({ page }) => {
    await page.goto("/photos");
    await expect(page.getByRole("main")).toBeVisible({ timeout: 15_000 });
    await expect(page.locator("body")).not.toContainText("Network Error");
  });
});

test.describe("Fullstack: API疎通確認", () => {
  test("backend /health/live エンドポイントが正常応答する", async ({
    page,
  }) => {
    const response = await page.request.get("/health/live");
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body).toMatchObject({ status: expect.stringMatching(/ok|healthy|alive/i) });
  });

  test("backend /health/ready エンドポイントが正常応答する", async ({
    page,
  }) => {
    const response = await page.request.get("/health/ready");
    expect([200, 503]).toContain(response.status());
    const body = await response.json();
    expect(body).toHaveProperty("status");
  });

  test("認証なしで /api/v1/projects にアクセスすると 401 が返る", async ({
    page,
  }) => {
    const response = await page.request.get("/api/v1/projects");
    expect(response.status()).toBe(401);
  });

  test("ログイン後に /api/v1/projects が正常応答する", async ({ page }) => {
    // Login via UI to get token stored in Zustand
    await loginAsAdmin(page);

    // Retrieve token from localStorage
    const token = await page.evaluate(() => {
      const raw = localStorage.getItem("servicehub-auth");
      if (!raw) return null;
      return (JSON.parse(raw).state as { token: string | null }).token;
    });

    expect(token).not.toBeNull();

    const response = await page.request.get("/api/v1/projects", {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body).toHaveProperty("data");
  });
});

test.describe("Fullstack: 工事案件 CRUD", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test("工事案件を作成して一覧に表示される", async ({ page }) => {
    await page.goto("/projects");
    await expect(page.getByRole("main")).toBeVisible({ timeout: 15_000 });

    // Open new project modal
    const createBtn = page.getByRole("button", { name: /新規/ });
    await expect(createBtn).toBeVisible({ timeout: 10_000 });
    await createBtn.click();

    // Fill in project form
    const modal = page.getByRole("dialog");
    await expect(modal).toBeVisible({ timeout: 5_000 });

    const ts = Date.now();
    const projectCode = `E2E-${String(ts).slice(-6)}`;
    const projectName = `E2E テスト案件 ${ts}`;
    await page.getByLabel(/案件コード/).fill(projectCode);
    await page.getByLabel(/案件名/).fill(projectName);
    await page.getByLabel(/施主名/).fill("E2Eテスト株式会社");

    // Submit
    await page.getByRole("button", { name: /登録|保存|作成/ }).click();

    // Project should appear in the list
    await expect(page.getByText(projectName)).toBeVisible({ timeout: 15_000 });
  });
});
