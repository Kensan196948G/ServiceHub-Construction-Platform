import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { NotificationPanel } from "./NotificationPanel";
import type { SSENotification } from "@/hooks/useSSE";

const mockNotifications: SSENotification[] = [
  {
    type: "notification",
    id: "n1",
    title: "テスト通知1",
    message: "本文メッセージ1",
    created_at: "2026-04-18T01:00:00.000Z",
  },
  {
    type: "notification",
    id: "n2",
    title: "テスト通知2",
    message: "本文メッセージ2",
  },
];

describe("NotificationPanel", () => {
  it("open=false のとき何も表示されない", () => {
    render(
      <NotificationPanel
        open={false}
        notifications={mockNotifications}
        onClose={vi.fn()}
        onClearAll={vi.fn()}
      />,
    );
    expect(screen.queryByTestId("notification-panel")).toBeNull();
  });

  it("open=true のときパネルが表示される", () => {
    render(
      <NotificationPanel
        open={true}
        notifications={mockNotifications}
        onClose={vi.fn()}
        onClearAll={vi.fn()}
      />,
    );
    expect(screen.getByTestId("notification-panel")).toBeInTheDocument();
  });

  it("通知一覧が表示される", () => {
    render(
      <NotificationPanel
        open={true}
        notifications={mockNotifications}
        onClose={vi.fn()}
        onClearAll={vi.fn()}
      />,
    );
    expect(screen.getByText("テスト通知1")).toBeInTheDocument();
    expect(screen.getByText("テスト通知2")).toBeInTheDocument();
    expect(screen.getAllByTestId("notification-item")).toHaveLength(2);
  });

  it("通知なしのとき空メッセージが表示される", () => {
    render(
      <NotificationPanel
        open={true}
        notifications={[]}
        onClose={vi.fn()}
        onClearAll={vi.fn()}
      />,
    );
    expect(screen.getByText("通知はありません")).toBeInTheDocument();
  });

  it("閉じるボタンクリックで onClose が呼ばれる", () => {
    const onClose = vi.fn();
    render(
      <NotificationPanel
        open={true}
        notifications={[]}
        onClose={onClose}
        onClearAll={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByTestId("notification-panel-close"));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("すべてクリアボタンクリックで onClearAll が呼ばれる", () => {
    const onClearAll = vi.fn();
    render(
      <NotificationPanel
        open={true}
        notifications={mockNotifications}
        onClose={vi.fn()}
        onClearAll={onClearAll}
      />,
    );
    fireEvent.click(screen.getByTestId("notification-clear-all"));
    expect(onClearAll).toHaveBeenCalledOnce();
  });

  it("Escape キーで onClose が呼ばれる", () => {
    const onClose = vi.fn();
    render(
      <NotificationPanel
        open={true}
        notifications={[]}
        onClose={onClose}
        onClearAll={vi.fn()}
      />,
    );
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("バックドロップクリックで onClose が呼ばれる", () => {
    const onClose = vi.fn();
    render(
      <NotificationPanel
        open={true}
        notifications={[]}
        onClose={onClose}
        onClearAll={vi.fn()}
      />,
    );
    fireEvent.mouseDown(screen.getByTestId("notification-panel-backdrop"));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("通知なしのとき 'すべてクリア' ボタンが表示されない", () => {
    render(
      <NotificationPanel
        open={true}
        notifications={[]}
        onClose={vi.fn()}
        onClearAll={vi.fn()}
      />,
    );
    expect(screen.queryByTestId("notification-clear-all")).toBeNull();
  });

  it("role=dialog と aria-modal が設定されている", () => {
    render(
      <NotificationPanel
        open={true}
        notifications={[]}
        onClose={vi.fn()}
        onClearAll={vi.fn()}
      />,
    );
    const panel = screen.getByRole("dialog");
    expect(panel).toHaveAttribute("aria-modal", "true");
  });
});
