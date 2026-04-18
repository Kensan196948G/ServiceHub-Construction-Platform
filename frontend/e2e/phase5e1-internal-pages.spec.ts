import { test, expect } from "@playwright/test";
import { loginAndNavigate } from "./fixtures/api-mocks";

test.describe("Phase 5e-1: 社内グループ 4 ページ smoke", () => {
  test("社内ポータル: 見出しとセクションが表示される", async ({ page }) => {
    await loginAndNavigate(page);
    await page.goto("/portal");
    await expect(page.getByRole("heading", { name: "社内ポータル", level: 1 })).toBeVisible();
    await expect(page.getByRole("heading", { name: "お知らせ", level: 2 })).toBeVisible();
    await expect(page.getByRole("heading", { name: "直近のイベント", level: 2 })).toBeVisible();
    await expect(page.getByRole("heading", { name: "クイックリンク", level: 2 })).toBeVisible();
  });

  test("お知らせ一覧: カテゴリフィルタで絞り込みできる", async ({ page }) => {
    await loginAndNavigate(page);
    await page.goto("/notices");
    await expect(page.getByRole("heading", { name: "お知らせ", level: 1 })).toBeVisible();

    const importantFilter = page.getByRole("button", { name: "重要" });
    await importantFilter.click();
    await expect(importantFilter).toHaveAttribute("aria-pressed", "true");
    await expect(
      page.getByText("2026 年度 安全衛生方針の公開について"),
    ).toBeVisible();
  });

  test("人事・勤怠: KPI と申請テーブルが表示される", async ({ page }) => {
    await loginAndNavigate(page);
    await page.goto("/hr");
    await expect(page.getByRole("heading", { name: "人事・勤怠", level: 1 })).toBeVisible();
    await expect(page.getByText("今月稼働日")).toBeVisible();
    await expect(page.getByText("有給残")).toBeVisible();
    await expect(page.getByRole("heading", { name: "手続きメニュー", level: 2 })).toBeVisible();
    await expect(page.getByRole("heading", { name: "最近の申請", level: 2 })).toBeVisible();
  });

  test("社内規程: カテゴリ検索で絞り込みできる", async ({ page }) => {
    await loginAndNavigate(page);
    await page.goto("/rules");
    await expect(page.getByRole("heading", { name: "社内規程", level: 1 })).toBeVisible();
    await expect(page.getByRole("heading", { name: "最近の改訂", level: 2 })).toBeVisible();

    await page.getByPlaceholder("規程カテゴリを検索").fill("安全");
    await expect(page.getByText("安全衛生規程")).toBeVisible();
    await expect(page.getByText("就業規則")).not.toBeVisible();
  });
});
