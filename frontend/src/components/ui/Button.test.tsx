import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { Button } from "./Button";

describe("Button", () => {
  it("renders children", () => {
    render(<Button>保存</Button>);
    expect(screen.getByRole("button", { name: "保存" })).toBeInTheDocument();
  });

  it("is enabled by default", () => {
    render(<Button>保存</Button>);
    expect(screen.getByRole("button")).toBeEnabled();
  });

  it("is disabled when loading", () => {
    render(<Button loading>保存</Button>);
    expect(screen.getByRole("button")).toBeDisabled();
  });

  it("shows loading text when loading", () => {
    render(<Button loading>保存</Button>);
    expect(screen.getByText("処理中...")).toBeInTheDocument();
  });

  it("applies primary variant classes", () => {
    const { container } = render(<Button variant="primary">送信</Button>);
    expect(container.firstChild).toHaveClass("bg-primary-600");
  });

  it("applies danger variant classes", () => {
    const { container } = render(<Button variant="danger">削除</Button>);
    expect(container.firstChild).toHaveClass("bg-red-600");
  });

  it("is disabled when disabled prop is set", () => {
    render(<Button disabled>保存</Button>);
    expect(screen.getByRole("button")).toBeDisabled();
  });
});
