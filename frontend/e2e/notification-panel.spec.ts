/**
 * E2E tests for notification badge + panel (Phase 4c)
 *
 * SSE injection strategy: Playwright route.fulfill() sends a complete HTTP
 * response. EventSource processes the body (onmessage), then fires onerror
 * when the response ends. This is sufficient to test UI reactions to SSE events.
 */
import { test, expect } from "@playwright/test";
import { loginAndNavigate } from "./fixtures/api-mocks";

/** SSE notification payload matching SSENotification type */
const SSE_NOTIFICATION = {
  type: "notification",
  id: "sse-1",
  title: "E2Eテスト通知",
  message: "テスト本文メッセージ",
  created_at: "2026-04-18T10:00:00.000Z",
};

/** Mock SSE stream to return empty stream (no notifications). */
async function mockSSEEmpty(page: import("@playwright/test").Page) {
  await page.route("**/api/v1/notifications/stream**", (route) => {
    route.fulfill({
      status: 200,
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
      },
      body: "",
    });
  });
}

/** Mock SSE stream to inject one notification event. */
async function mockSSEWithNotification(
  page: import("@playwright/test").Page,
) {
  await page.route("**/api/v1/notifications/stream**", (route) => {
    const payload = JSON.stringify(SSE_NOTIFICATION);
    route.fulfill({
      status: 200,
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
      },
      body: `data: ${payload}\n\n`,
    });
  });
}

test.describe("Notification Badge + Panel (Phase 4c)", () => {
  test("通知バッジがヘッダーに表示される", async ({ page }) => {
    await mockSSEEmpty(page);
    await loginAndNavigate(page);

    const badge = page.getByTestId("notification-badge");
    await expect(badge).toBeVisible();
  });

  test("初期状態でパネルは非表示", async ({ page }) => {
    await mockSSEEmpty(page);
    await loginAndNavigate(page);

    await expect(page.getByTestId("notification-panel")).not.toBeVisible();
  });

  test("バッジクリックでパネルが開く", async ({ page }) => {
    await mockSSEEmpty(page);
    await loginAndNavigate(page);

    await page.getByTestId("notification-badge").click();
    await expect(page.getByTestId("notification-panel")).toBeVisible();
  });

  test("閉じるボタンでパネルが閉じる", async ({ page }) => {
    await mockSSEEmpty(page);
    await loginAndNavigate(page);

    await page.getByTestId("notification-badge").click();
    await expect(page.getByTestId("notification-panel")).toBeVisible();

    await page.getByTestId("notification-panel-close").click();
    await expect(page.getByTestId("notification-panel")).not.toBeVisible();
  });

  test("Escape キーでパネルが閉じる", async ({ page }) => {
    await mockSSEEmpty(page);
    await loginAndNavigate(page);

    await page.getByTestId("notification-badge").click();
    await expect(page.getByTestId("notification-panel")).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(page.getByTestId("notification-panel")).not.toBeVisible();
  });

  test("バックドロップクリックでパネルが閉じる", async ({ page }) => {
    await mockSSEEmpty(page);
    await loginAndNavigate(page);

    await page.getByTestId("notification-badge").click();
    await expect(page.getByTestId("notification-panel")).toBeVisible();

    await page.getByTestId("notification-panel-backdrop").click();
    await expect(page.getByTestId("notification-panel")).not.toBeVisible();
  });

  test("通知がない場合 '通知はありません' が表示される", async ({ page }) => {
    await mockSSEEmpty(page);
    await loginAndNavigate(page);

    await page.getByTestId("notification-badge").click();
    await expect(page.getByText("通知はありません")).toBeVisible();
  });

  test("SSE 通知受信でバッジカウントが増加する", async ({ page }) => {
    await mockSSEWithNotification(page);
    await loginAndNavigate(page);

    // Wait for SSE event to be processed by the hook
    const unreadBadge = page.getByTestId("unread-count");
    await expect(unreadBadge).toBeVisible({ timeout: 5000 });
    await expect(unreadBadge).toHaveText("1");
  });

  test("SSE 通知受信後にパネルを開くと通知が表示される", async ({ page }) => {
    await mockSSEWithNotification(page);
    await loginAndNavigate(page);

    // Wait for the notification to arrive
    await expect(page.getByTestId("unread-count")).toBeVisible({ timeout: 5000 });

    await page.getByTestId("notification-badge").click();
    await expect(page.getByTestId("notification-panel")).toBeVisible();

    // Notification title should be in the list
    await expect(page.getByText(SSE_NOTIFICATION.title)).toBeVisible();
  });

  test("パネルを開くと未読カウントがクリアされる", async ({ page }) => {
    await mockSSEWithNotification(page);
    await loginAndNavigate(page);

    // Wait for unread badge
    await expect(page.getByTestId("unread-count")).toBeVisible({ timeout: 5000 });

    // Click badge — this calls clearUnread() and opens panel
    await page.getByTestId("notification-badge").click();

    // After opening, unread count should be cleared (badge disappears)
    await expect(page.getByTestId("unread-count")).not.toBeVisible();
  });

  test("'すべてクリア' でパネルが閉じてリストがクリアされる", async ({ page }) => {
    await mockSSEWithNotification(page);
    await loginAndNavigate(page);

    await expect(page.getByTestId("unread-count")).toBeVisible({ timeout: 5000 });
    await page.getByTestId("notification-badge").click();
    await expect(page.getByTestId("notification-panel")).toBeVisible();

    await page.getByTestId("notification-clear-all").click();

    // Panel closes and notification list is empty
    await expect(page.getByTestId("notification-panel")).not.toBeVisible();
  });

  test("パネルに role=dialog と aria-modal 属性がある", async ({ page }) => {
    await mockSSEEmpty(page);
    await loginAndNavigate(page);

    await page.getByTestId("notification-badge").click();
    const panel = page.getByRole("dialog");
    await expect(panel).toBeVisible();
    await expect(panel).toHaveAttribute("aria-modal", "true");
  });
});
