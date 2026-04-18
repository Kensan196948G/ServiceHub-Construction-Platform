import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { NotificationBadge } from "./NotificationBadge";

describe("NotificationBadge", () => {
  it("renders bell icon without badge when count is 0", () => {
    render(<NotificationBadge count={0} />);
    expect(screen.getByTestId("notification-badge")).toBeInTheDocument();
    expect(screen.queryByTestId("unread-count")).toBeNull();
  });

  it("shows count badge when count > 0", () => {
    render(<NotificationBadge count={5} />);
    expect(screen.getByTestId("unread-count")).toHaveTextContent("5");
  });

  it("shows 99+ when count > 99", () => {
    render(<NotificationBadge count={150} />);
    expect(screen.getByTestId("unread-count")).toHaveTextContent("99+");
  });

  it("calls onClick when clicked", () => {
    const onClick = vi.fn();
    render(<NotificationBadge count={3} onClick={onClick} />);
    fireEvent.click(screen.getByTestId("notification-badge"));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("has accessible aria-label with count", () => {
    render(<NotificationBadge count={2} />);
    expect(screen.getByLabelText("未読通知 2 件")).toBeInTheDocument();
  });

  it("has generic aria-label when count is 0", () => {
    render(<NotificationBadge count={0} />);
    expect(screen.getByLabelText("通知")).toBeInTheDocument();
  });
});
