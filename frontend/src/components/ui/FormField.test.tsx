import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { FormField, Input, Textarea, Select } from "./FormField";

describe("FormField", () => {
  it("renders label and children", () => {
    render(
      <FormField label="プロジェクト名" htmlFor="name">
        <Input id="name" />
      </FormField>,
    );
    expect(screen.getByText("プロジェクト名")).toBeInTheDocument();
    expect(screen.getByRole("textbox")).toBeInTheDocument();
  });

  it("shows required indicator", () => {
    render(
      <FormField label="名前" htmlFor="name" required>
        <Input id="name" />
      </FormField>,
    );
    expect(screen.getByText("*")).toBeInTheDocument();
  });

  it("shows error message", () => {
    render(
      <FormField label="名前" htmlFor="name" error="入力必須です">
        <Input id="name" error />
      </FormField>,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("入力必須です");
  });
});

describe("Input", () => {
  it("renders with error styles", () => {
    const { container } = render(<Input error />);
    expect(container.firstChild).toHaveClass("border-red-300");
  });

  it("renders with normal styles", () => {
    const { container } = render(<Input />);
    expect(container.firstChild).toHaveClass("border-gray-300");
  });
});

describe("Textarea", () => {
  it("renders textarea element", () => {
    render(<Textarea placeholder="説明を入力" />);
    expect(screen.getByPlaceholderText("説明を入力")).toBeInTheDocument();
  });
});

describe("Select", () => {
  const options = [
    { value: "active", label: "有効" },
    { value: "closed", label: "終了" },
  ];

  it("renders options", () => {
    render(<Select options={options} />);
    expect(screen.getByText("有効")).toBeInTheDocument();
    expect(screen.getByText("終了")).toBeInTheDocument();
  });

  it("renders placeholder", () => {
    render(<Select options={options} placeholder="選択してください" defaultValue="" />);
    expect(screen.getByText("選択してください")).toBeInTheDocument();
  });
});
