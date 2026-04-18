import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { ThemeProvider } from "@/contexts/ThemeContext";
import Layout from "./Layout";

vi.mock("@/hooks/useSSE", () => ({
  useSSE: () => ({ unreadCount: 0, clearUnread: vi.fn(), clearNotifications: vi.fn(), notifications: [], connected: false }),
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
    // "ServiceHub" appears in both sidebar logo and breadcrumb; verify at least one exists
    expect(screen.getAllByText("ServiceHub").length).toBeGreaterThan(0);
    expect(screen.getByText("工事管理")).toBeInTheDocument();
  });

  it("サイドバーロゴが表示される", () => {
    renderLayout();
    // Sidebar logo text is in <p> elements inside the sidebar
    const sidebar = screen.getByRole("complementary", { name: "サイドバーナビゲーション" });
    expect(sidebar).toHaveTextContent("ServiceHub");
    expect(sidebar).toHaveTextContent("工事管理");
  });

  it("ナビゲーション項目が表示される", () => {
    renderLayout();
    const nav = screen.getByRole("navigation", { name: "メインナビゲーション" });
    expect(nav).toHaveTextContent("ダッシュボード");
    expect(nav).toHaveTextContent("工事案件");
    expect(nav).toHaveTextContent("日報");
    expect(nav).toHaveTextContent("安全品質");
    expect(nav).toHaveTextContent("原価管理");
    expect(nav).toHaveTextContent("写真管理");
    expect(nav).toHaveTextContent("ITSM");
    expect(nav).toHaveTextContent("ナレッジ");
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
    // Logout button is icon-only with aria-label
    fireEvent.click(screen.getByRole("button", { name: "ログアウト" }));
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
