import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { ThemeProvider } from "@/contexts/ThemeContext";
import Layout from "./Layout";

vi.mock("@/hooks/useSSE", () => ({
  useSSE: () => ({ unreadCount: 0, clearUnread: vi.fn(), notifications: [], connected: false }),
}));

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    Outlet: () => <div data-testid="outlet">Page Content</div>,
  };
});

const mockLogout = vi.fn();
vi.mock("@/stores/authStore", () => ({
  useAuthStore: vi.fn(() => ({
    user: { id: "u1", email: "test@example.com", full_name: "テストユーザー", role: "ADMIN" },
    logout: mockLogout,
  })),
}));

function renderLayout(path = "/dashboard") {
  return render(
    <ThemeProvider>
      <MemoryRouter initialEntries={[path]}>
        <Layout />
      </MemoryRouter>
    </ThemeProvider>,
  );
}

describe("Layout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("アプリケーション名が表示される", () => {
    renderLayout();
    expect(screen.getByText("ServiceHub")).toBeInTheDocument();
    expect(screen.getByText("工事管理")).toBeInTheDocument();
  });

  it("ヘッダータイトルが表示される", () => {
    renderLayout();
    expect(screen.getByText("ServiceHub 工事管理プラットフォーム")).toBeInTheDocument();
  });

  it("ナビゲーション項目が表示される", () => {
    renderLayout();
    expect(screen.getByText("ダッシュボード")).toBeInTheDocument();
    expect(screen.getByText("工事案件")).toBeInTheDocument();
    expect(screen.getByText("日報")).toBeInTheDocument();
    expect(screen.getByText("安全品質")).toBeInTheDocument();
    expect(screen.getByText("原価管理")).toBeInTheDocument();
    expect(screen.getByText("写真管理")).toBeInTheDocument();
    expect(screen.getByText("ITSM")).toBeInTheDocument();
    expect(screen.getByText("ナレッジ")).toBeInTheDocument();
  });

  it("ADMINユーザーの場合、ユーザー管理が表示される", () => {
    renderLayout();
    expect(screen.getByText("ユーザー管理")).toBeInTheDocument();
  });

  it("ユーザー名が表示される", () => {
    renderLayout();
    expect(screen.getByText(/テストユーザー/)).toBeInTheDocument();
  });

  it("ログアウトボタンをクリックすると logout が呼ばれる", () => {
    renderLayout();
    fireEvent.click(screen.getByText("ログアウト"));
    expect(mockLogout).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith("/login");
  });

  it("Outletがレンダリングされる", () => {
    renderLayout();
    expect(screen.getByTestId("outlet")).toBeInTheDocument();
  });

  it("モバイルメニューボタンが存在する", () => {
    renderLayout();
    const buttons = screen.getAllByRole("button");
    // header has the menu toggle button (first non-logout button)
    const menuBtn = buttons.find((b) => b.className.includes("lg:hidden"));
    expect(menuBtn).toBeDefined();
  });

  it("テーマトグルボタンが表示される", () => {
    renderLayout();
    const toggle = screen.getByTestId("theme-toggle");
    expect(toggle).toBeInTheDocument();
    const label = toggle.getAttribute("aria-label");
    expect(["ダークモードに切り替え", "ライトモードに切り替え"]).toContain(label);
  });

  it("テーマトグルをクリックすると aria-label が切り替わる", () => {
    // Start in light mode
    localStorage.setItem("theme", "light");
    renderLayout();
    const toggle = screen.getByTestId("theme-toggle");
    expect(toggle).toHaveAttribute("aria-label", "ダークモードに切り替え");
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-label", "ライトモードに切り替え");
  });
});
