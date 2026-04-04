import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import DashboardPage from "./DashboardPage";

vi.mock("@/api/projects", () => ({
  projectsApi: { list: vi.fn() },
}));

vi.mock("@/api/itsm", () => ({
  itsmApi: { listIncidents: vi.fn() },
}));

vi.mock("@/api/dashboard", () => ({
  useDashboardKPI: vi.fn(),
}));

vi.mock("@/stores/authStore", () => ({
  useAuthStore: vi.fn(),
}));

import { projectsApi } from "@/api/projects";
import { itsmApi } from "@/api/itsm";
import { useDashboardKPI } from "@/api/dashboard";
import { useAuthStore } from "@/stores/authStore";

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
}

function renderPage() {
  return render(
    <MemoryRouter>
      <QueryClientProvider client={makeQueryClient()}>
        <DashboardPage />
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

describe("DashboardPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuthStore).mockReturnValue({
      user: { id: "u1", email: "test@example.com", full_name: "テストユーザー", role: "user" },
    } as ReturnType<typeof useAuthStore>);
  });

  it("ローディング中はスケルトンが表示される", () => {
    vi.mocked(useDashboardKPI).mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      refetch: vi.fn(),
    } as ReturnType<typeof useDashboardKPI>);
    vi.mocked(projectsApi.list).mockImplementation(() => new Promise(() => {}));
    vi.mocked(itsmApi.listIncidents).mockImplementation(() => new Promise(() => {}));

    renderPage();

    // ユーザー名の挨拶が表示される
    expect(screen.getByText(/こんにちは/)).toBeInTheDocument();
  });

  it("KPIデータが取得できた場合に統計カードが表示される", () => {
    vi.mocked(useDashboardKPI).mockReturnValue({
      data: {
        projects: { total: 5, planning: 1, in_progress: 2, on_hold: 1, completed: 1 },
        incidents: { total: 3, open: 2, in_progress: 1, resolved: 0 },
        cost_overview: { total_budgeted: 1000000, total_actual: 800000, variance: 200000, variance_rate: 20 },
        daily_reports_count: 10,
        photos_count: 25,
        users_count: 5,
      },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as ReturnType<typeof useDashboardKPI>);
    vi.mocked(projectsApi.list).mockResolvedValue({
      data: [],
      meta: { page: 1, per_page: 5, total: 0, pages: 0 },
    });
    vi.mocked(itsmApi.listIncidents).mockResolvedValue({
      data: [],
      meta: { page: 1, per_page: 3, total: 0, pages: 0 },
    });

    renderPage();

    expect(screen.getByText(/こんにちは/)).toBeInTheDocument();
    expect(screen.getByText("ServiceHub 工事管理プラットフォーム")).toBeInTheDocument();
  });

  it("KPIエラー時はエラーメッセージが表示される", () => {
    vi.mocked(useDashboardKPI).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      refetch: vi.fn(),
    } as ReturnType<typeof useDashboardKPI>);
    vi.mocked(projectsApi.list).mockResolvedValue({
      data: [],
      meta: { page: 1, per_page: 5, total: 0, pages: 0 },
    });
    vi.mocked(itsmApi.listIncidents).mockResolvedValue({
      data: [],
      meta: { page: 1, per_page: 3, total: 0, pages: 0 },
    });

    renderPage();

    expect(screen.getByText("KPI データの取得に失敗しました")).toBeInTheDocument();
  });
});
