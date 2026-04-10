import { test, expect } from "@playwright/test";
import { loginAndNavigate } from "./fixtures/api-mocks";

const DEFAULT_PREFS = {
  email_enabled: true,
  slack_enabled: false,
  slack_webhook_url: null,
  events: {
    daily_report_submitted: { email: true, slack: false },
    safety_incident_created: { email: true, slack: true },
    change_request_pending_approval: { email: true, slack: false },
    incident_assigned: { email: true, slack: false },
    project_status_changed: { email: false, slack: false },
  },
};

/** Mock the notification-preferences endpoint. */
async function mockNotificationPreferencesApi(
  page: import("@playwright/test").Page,
  opts: { initialPrefs?: typeof DEFAULT_PREFS; failPatch?: boolean } = {},
) {
  const initial = opts.initialPrefs ?? DEFAULT_PREFS;
  let current = { ...initial };

  await page.route("**/api/v1/users/me/notification-preferences", (route) => {
    const method = route.request().method();
    if (method === "GET") {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ data: current }),
      });
    } else if (method === "PATCH") {
      if (opts.failPatch) {
        route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({ detail: "Internal server error" }),
        });
        return;
      }
      const body = route.request().postDataJSON() ?? {};
      current = { ...current, ...body };
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ data: current }),
      });
    } else {
      route.fulfill({ status: 405 });
    }
  });
}

/** Navigate to settings page with notification preferences mocked. */
async function goToSettingsWithPrefs(
  page: import("@playwright/test").Page,
  opts?: { initialPrefs?: typeof DEFAULT_PREFS; failPatch?: boolean },
) {
  await loginAndNavigate(page);
  await mockNotificationPreferencesApi(page, opts);
  await page.getByRole("link", { name: "設定" }).click();
  await page.waitForURL("**/settings");
  await expect(
    page.getByRole("heading", { name: "設定", level: 1 }),
  ).toBeVisible({ timeout: 10_000 });
}

test.describe("Notification Preferences Settings", () => {
  test("displays notification preferences section with loaded defaults", async ({
    page,
  }) => {
    await goToSettingsWithPrefs(page);

    await expect(
      page.getByTestId("notification-preferences-section"),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "通知設定" }),
    ).toBeVisible();

    // Master switches should reflect defaults
    await expect(
      page.getByRole("checkbox", { name: "メール通知を有効にする" }),
    ).toBeChecked();
    await expect(
      page.getByRole("checkbox", { name: "Slack 通知を有効にする" }),
    ).not.toBeChecked();
  });

  test("shows per-event table with all default events", async ({ page }) => {
    await goToSettingsWithPrefs(page);

    // All 5 default events should appear as rows
    await expect(page.getByText("日報提出時")).toBeVisible();
    await expect(page.getByText("安全インシデント発生時")).toBeVisible();
    await expect(page.getByText("変更要求承認待ち")).toBeVisible();
    await expect(page.getByText("ITSM インシデント割当時")).toBeVisible();
    await expect(page.getByText("案件ステータス変更時")).toBeVisible();
  });

  test("slack webhook URL field appears only when slack is enabled", async ({
    page,
  }) => {
    await goToSettingsWithPrefs(page);

    // Initially slack is disabled, webhook URL field hidden
    await expect(page.getByLabel("Slack Webhook URL")).not.toBeVisible();

    // Enable slack
    await page
      .getByRole("checkbox", { name: "Slack 通知を有効にする" })
      .check();

    // Webhook URL field appears
    await expect(page.getByLabel("Slack Webhook URL")).toBeVisible();
  });

  test("toggles master email switch and saves successfully", async ({
    page,
  }) => {
    await goToSettingsWithPrefs(page);

    // Uncheck email master switch
    await page
      .getByRole("checkbox", { name: "メール通知を有効にする" })
      .uncheck();

    await page.getByRole("button", { name: "通知設定を保存" }).click();

    await expect(page.getByRole("status")).toContainText("保存しました", {
      timeout: 10_000,
    });
  });

  test("toggles a per-event channel checkbox", async ({ page }) => {
    await goToSettingsWithPrefs(page);

    // "案件ステータス変更時" email should start unchecked
    const projectStatusEmail = page.getByRole("checkbox", {
      name: "案件ステータス変更時 のメール通知",
    });
    await expect(projectStatusEmail).not.toBeChecked();

    await projectStatusEmail.check();
    await expect(projectStatusEmail).toBeChecked();
  });

  test("shows error message when save fails", async ({ page }) => {
    await goToSettingsWithPrefs(page, { failPatch: true });

    await page
      .getByRole("checkbox", { name: "メール通知を有効にする" })
      .uncheck();
    await page.getByRole("button", { name: "通知設定を保存" }).click();

    await expect(page.getByRole("alert")).toContainText("失敗しました", {
      timeout: 10_000,
    });
  });
});
