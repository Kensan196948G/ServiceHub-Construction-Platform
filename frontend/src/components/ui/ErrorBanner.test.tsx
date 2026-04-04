import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { ErrorBanner, ErrorText } from "./ErrorBanner";

describe("ErrorBanner", () => {
  it("renders default message", () => {
    render(<ErrorBanner />);
    expect(screen.getByText("データの取得に失敗しました。")).toBeInTheDocument();
  });

  it("renders custom message", () => {
    render(<ErrorBanner message="カスタムエラー" />);
    expect(screen.getByText("カスタムエラー")).toBeInTheDocument();
  });

  it("renders children over message", () => {
    render(<ErrorBanner message="ignored">子要素の内容</ErrorBanner>);
    expect(screen.getByText("子要素の内容")).toBeInTheDocument();
    expect(screen.queryByText("ignored")).not.toBeInTheDocument();
  });

  it("has role=alert for accessibility", () => {
    render(<ErrorBanner />);
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  it("applies custom className", () => {
    render(<ErrorBanner className="col-span-full" />);
    expect(screen.getByRole("alert")).toHaveClass("col-span-full");
  });
});

describe("ErrorText", () => {
  it("renders message", () => {
    render(<ErrorText message="作成に失敗しました。" />);
    expect(screen.getByText("作成に失敗しました。")).toBeInTheDocument();
  });

  it("renders children over message", () => {
    render(<ErrorText message="ignored">カスタム</ErrorText>);
    expect(screen.getByText("カスタム")).toBeInTheDocument();
  });

  it("has role=alert", () => {
    render(<ErrorText message="テスト" />);
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });
});
