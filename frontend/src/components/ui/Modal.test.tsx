import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeAll } from "vitest";
import { Modal } from "./Modal";

// jsdom does not implement HTMLDialogElement methods
beforeAll(() => {
  HTMLDialogElement.prototype.showModal = vi.fn();
  HTMLDialogElement.prototype.close = vi.fn();
});

describe("Modal", () => {
  it("renders nothing when closed", () => {
    const { container } = render(
      <Modal open={false} onClose={vi.fn()}>
        content
      </Modal>,
    );
    expect(container.innerHTML).toBe("");
  });

  it("renders title and children when open", () => {
    render(
      <Modal open={true} onClose={vi.fn()} title="確認">
        <p>本当に削除しますか？</p>
      </Modal>,
    );
    expect(screen.getByText("確認")).toBeInTheDocument();
    expect(screen.getByText("本当に削除しますか？")).toBeInTheDocument();
  });

  it("calls onClose when close button is clicked", () => {
    const onClose = vi.fn();
    render(
      <Modal open={true} onClose={onClose} title="テスト">
        body
      </Modal>,
    );
    fireEvent.click(screen.getByLabelText("閉じる"));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("calls showModal on the dialog element", () => {
    render(
      <Modal open={true} onClose={vi.fn()} title="Show">
        body
      </Modal>,
    );
    expect(HTMLDialogElement.prototype.showModal).toHaveBeenCalled();
  });
});
