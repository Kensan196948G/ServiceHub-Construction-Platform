import { test, expect } from "@playwright/test";
import { loginAndNavigate, MOCK_PHOTOS, MOCK_PROJECTS } from "./fixtures/api-mocks";

const UPLOADED_PHOTO = {
  id: "photo-new",
  project_id: "1",
  filename: "upload-test.jpg",
  original_filename: "テスト写真.jpg",
  file_size: 51200,
  mime_type: "image/jpeg",
  category: "GENERAL",
  description: "アップロードテスト",
  taken_at: "2026-04-15T09:00:00Z",
  url: null,
  created_at: "2026-04-15T09:00:00Z",
};

/** Set up photos page with mutable list supporting upload/delete mock responses. */
async function setupPhotosCrudPage(page: import("@playwright/test").Page) {
  await loginAndNavigate(page);

  await page.route("**/api/v1/projects**", (route) => {
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: MOCK_PROJECTS,
        meta: { page: 1, per_page: 100, total: 2 },
      }),
    });
  });

  let photosList = [...MOCK_PHOTOS];

  // DELETE route must be registered before the GET/POST route to avoid glob shadowing
  await page.route("**/api/v1/projects/1/photos/*", (route) => {
    const method = route.request().method();
    if (method === "DELETE") {
      const url = route.request().url();
      photosList = photosList.filter((p) => !url.includes(p.id));
      route.fulfill({ status: 204 });
    } else {
      // GET single photo
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: photosList[0] }),
      });
    }
  });

  await page.route("**/api/v1/projects/1/photos**", (route) => {
    const method = route.request().method();
    if (method === "POST") {
      photosList = [UPLOADED_PHOTO, ...photosList];
      route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: UPLOADED_PHOTO }),
      });
    } else {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: photosList,
          meta: { total: photosList.length, page: 1, per_page: 20, pages: 1 },
        }),
      });
    }
  });

  await page.getByRole("link", { name: "写真管理" }).click();
  await page.waitForURL("**/photos");
  await page.locator("select").first().selectOption("1");

  // Wait for initial photos to load
  await expect(page.getByText("2階部分の鉄骨組み立て完了")).toBeVisible({ timeout: 10_000 });
}

test.describe("Photos CRUD", () => {
  test("uploads a photo via file input", async ({ page }) => {
    await setupPhotosCrudPage(page);

    // The file input is hidden inside a <label> wrapper — use force to bypass display:none
    await page.locator('input[type="file"]').setInputFiles(
      {
        name: "テスト写真.jpg",
        mimeType: "image/jpeg",
        buffer: Buffer.from("fake-image-data"),
      },
      { force: true }
    );

    // After upload, the new photo's filename should appear in the grid
    await expect(page.getByText("テスト写真.jpg")).toBeVisible({ timeout: 10_000 });
  });

  test("uploads a photo with a custom description", async ({ page }) => {
    await setupPhotosCrudPage(page);

    // Fill description field (has htmlFor="description-input")
    await page.getByLabel("説明（任意）").fill("アップロードテスト");

    // Trigger file upload
    await page.locator('input[type="file"]').setInputFiles(
      {
        name: "テスト写真.jpg",
        mimeType: "image/jpeg",
        buffer: Buffer.from("fake-image-data"),
      },
      { force: true }
    );

    // Uploaded photo description should appear
    await expect(page.getByText("アップロードテスト")).toBeVisible({ timeout: 10_000 });
  });

  test("deletes a photo via delete button", async ({ page }) => {
    await setupPhotosCrudPage(page);

    // Auto-accept the window.confirm() dialog
    page.on("dialog", (dialog) => dialog.accept());

    // The delete button is opacity-0 until hover; use force:true to click regardless
    await page.getByRole("button", { name: "削除" }).first().click({ force: true });

    // One photo is deleted — only the second photo should remain visible
    await expect(page.getByText("2階部分の鉄骨組み立て完了")).not.toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("安全帯着用確認")).toBeVisible();
  });

  test("cancels photo deletion when confirm is dismissed", async ({ page }) => {
    await setupPhotosCrudPage(page);

    // Dismiss the confirm dialog
    page.on("dialog", (dialog) => dialog.dismiss());

    await page.getByRole("button", { name: "削除" }).first().click({ force: true });

    // Both photos should still be present after cancellation
    await expect(page.getByText("2階部分の鉄骨組み立て完了")).toBeVisible({ timeout: 5_000 });
    await expect(page.getByText("安全帯着用確認")).toBeVisible();
  });

  test("shows upload section with category selector and file button", async ({ page }) => {
    await setupPhotosCrudPage(page);

    await expect(page.getByText("📤 写真アップロード")).toBeVisible({ timeout: 10_000 });
    // Category selector has htmlFor="category-select"
    await expect(page.getByLabel("カテゴリ")).toBeVisible();
    // Description input has htmlFor="description-input"
    await expect(page.getByLabel("説明（任意）")).toBeVisible();
    // File select button text (wrapped in <label>, pointer-events-none)
    await expect(page.getByText("ファイル選択")).toBeVisible();
  });

  test("changes upload category before uploading", async ({ page }) => {
    await setupPhotosCrudPage(page);

    // Switch category to SAFETY
    await page.getByLabel("カテゴリ").selectOption("SAFETY");

    await page.locator('input[type="file"]').setInputFiles(
      {
        name: "テスト写真.jpg",
        mimeType: "image/jpeg",
        buffer: Buffer.from("fake-image-data"),
      },
      { force: true }
    );

    // Uploaded photo appears (category is handled server-side; verify filename)
    await expect(page.getByText("テスト写真.jpg")).toBeVisible({ timeout: 10_000 });
  });
});
