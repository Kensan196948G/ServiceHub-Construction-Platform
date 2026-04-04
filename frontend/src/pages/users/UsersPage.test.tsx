import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import UsersPage from "./UsersPage";

vi.mock("@/api/users", () => ({
  usersApi: {
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    deleteUser: vi.fn(),
    get: vi.fn(),
  },
}));

vi.mock("@/stores/authStore", () => ({
  useAuthStore: vi.fn(),
}));

import { usersApi } from "@/api/users";
import { useAuthStore } from "@/stores/authStore";

// UsersPage uses useAuthStore as a selector: useAuthStore((s) => s.user)
// Mock it to return the user object directly when called with a selector
const adminUser = { id: "u1", email: "admin@example.com", full_name: "管理者", role: "ADMIN" };
const normalUser = { id: "u2", email: "user@example.com", full_name: "一般ユーザー", role: "user" };

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
}

function renderPage() {
  return render(
    <MemoryRouter>
      <QueryClientProvider client={makeQueryClient()}>
        <UsersPage />
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

describe("UsersPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(usersApi.list).mockResolvedValue({
      data: [],
      meta: { page: 1, per_page: 20, total: 0, pages: 0 },
    });
  });

  it("ADMINユーザーにはユーザー管理ページが表示される", () => {
    // Selector pattern: useAuthStore((s) => s.user)
    vi.mocked(useAuthStore).mockImplementation((selector?: (s: { user: typeof adminUser }) => typeof adminUser) => {
      const store = { user: adminUser };
      return selector ? selector(store) : store;
    });

    renderPage();
    expect(screen.getByText("ユーザー管理")).toBeInTheDocument();
  });

  it("非ADMINユーザーにはアクセス制限メッセージが表示される", () => {
    vi.mocked(useAuthStore).mockImplementation((selector?: (s: { user: typeof normalUser }) => typeof normalUser) => {
      const store = { user: normalUser };
      return selector ? selector(store) : store;
    });

    renderPage();
    expect(screen.getByText(/ADMIN/)).toBeInTheDocument();
  });

  it("ADMINユーザーは「新規ユーザー作成」ボタンを見られる", () => {
    vi.mocked(useAuthStore).mockImplementation((selector?: (s: { user: typeof adminUser }) => typeof adminUser) => {
      const store = { user: adminUser };
      return selector ? selector(store) : store;
    });

    renderPage();
    expect(screen.getByText("新規ユーザー作成")).toBeInTheDocument();
  });

  it("「新規ユーザー作成」ボタンクリックでモーダルが開く", () => {
    vi.mocked(useAuthStore).mockImplementation((selector?: (s: { user: typeof adminUser }) => typeof adminUser) => {
      const store = { user: adminUser };
      return selector ? selector(store) : store;
    });

    renderPage();
    fireEvent.click(screen.getByText("新規ユーザー作成"));
    expect(screen.getByText("新規ユーザー作成", { selector: "h2" })).toBeInTheDocument();
  });
});
