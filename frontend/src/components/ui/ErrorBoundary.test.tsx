import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import { ErrorBoundary } from "./ErrorBoundary";

// Suppress React's console.error output for intentional throws
beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
});

/** Helper: a component that throws during render */
function Bomb({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) throw new Error("テスト用の意図的なエラー");
  return <div>正常なコンテンツ</div>;
}

describe("ErrorBoundary", () => {
  it("renders children normally when no error occurs", () => {
    render(
      <ErrorBoundary>
        <Bomb shouldThrow={false} />
      </ErrorBoundary>
    );
    expect(screen.getByText("正常なコンテンツ")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("shows default fallback UI when a child throws", () => {
    render(
      <ErrorBoundary>
        <Bomb shouldThrow={true} />
      </ErrorBoundary>
    );
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText("予期しないエラーが発生しました")).toBeInTheDocument();
    expect(screen.getByText("テスト用の意図的なエラー")).toBeInTheDocument();
    expect(screen.queryByText("正常なコンテンツ")).not.toBeInTheDocument();
  });

  it("shows retry button in default fallback", () => {
    render(
      <ErrorBoundary>
        <Bomb shouldThrow={true} />
      </ErrorBoundary>
    );
    expect(screen.getByRole("button", { name: "再試行" })).toBeInTheDocument();
  });

  it("renders custom fallback when provided", () => {
    render(
      <ErrorBoundary fallback={(error) => <p>カスタム: {error.message}</p>}>
        <Bomb shouldThrow={true} />
      </ErrorBoundary>
    );
    expect(screen.getByText(/カスタム: テスト用の意図的なエラー/)).toBeInTheDocument();
  });

  it("resets and shows children again when retry is clicked", () => {
    // We need a stateful wrapper to control shouldThrow after reset
    function Wrapper() {
      const [shouldThrow, setShouldThrow] = React.useState(true);
      return (
        <ErrorBoundary
          fallback={(_err, reset) => (
            <button onClick={() => { setShouldThrow(false); reset(); }}>
              再試行
            </button>
          )}
        >
          <Bomb shouldThrow={shouldThrow} />
        </ErrorBoundary>
      );
    }
    render(<Wrapper />);

    expect(screen.getByRole("button", { name: "再試行" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "再試行" }));
    expect(screen.getByText("正常なコンテンツ")).toBeInTheDocument();
  });

  it("has data-testid on fallback for E2E targeting", () => {
    render(
      <ErrorBoundary>
        <Bomb shouldThrow={true} />
      </ErrorBoundary>
    );
    expect(screen.getByTestId("error-boundary-fallback")).toBeInTheDocument();
  });
});
