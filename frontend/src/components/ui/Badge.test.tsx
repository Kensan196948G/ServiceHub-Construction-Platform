import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { Badge } from "./Badge";

describe("Badge", () => {
  it("renders children", () => {
    render(<Badge variant="default">テスト</Badge>);
    expect(screen.getByText("テスト")).toBeInTheDocument();
  });

  it("applies success variant classes", () => {
    const { container } = render(<Badge variant="success">完了</Badge>);
    expect(container.firstChild).toHaveClass("bg-green-100");
    expect(container.firstChild).toHaveClass("text-green-800");
  });

  it("applies warning variant classes", () => {
    const { container } = render(<Badge variant="warning">保留</Badge>);
    expect(container.firstChild).toHaveClass("bg-yellow-100");
    expect(container.firstChild).toHaveClass("text-yellow-800");
  });

  it("applies danger variant classes", () => {
    const { container } = render(<Badge variant="danger">未対応</Badge>);
    expect(container.firstChild).toHaveClass("bg-red-100");
    expect(container.firstChild).toHaveClass("text-red-800");
  });

  it("applies info variant classes", () => {
    const { container } = render(<Badge variant="info">計画中</Badge>);
    expect(container.firstChild).toHaveClass("bg-blue-100");
    expect(container.firstChild).toHaveClass("text-blue-800");
  });

  it("applies sm size classes", () => {
    const { container } = render(<Badge variant="default" size="sm">小</Badge>);
    expect(container.firstChild).toHaveClass("text-xs");
  });

  it("accepts additional className", () => {
    const { container } = render(
      <Badge variant="default" className="extra-class">テスト</Badge>
    );
    expect(container.firstChild).toHaveClass("extra-class");
  });
});
