import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import CostPage from "./CostPage";

vi.mock("@/api/cost", () => ({
  costApi: {
    listCostRecords: vi.fn(),
    getCostSummary: vi.fn(),
    createCostRecord: vi.fn(),
    deleteCostRecord: vi.fn(),
    createWorkHour: vi.fn(),
    listWorkHours: vi.fn(),
  },
}));

vi.mock("@/api/projects", () => ({
  projectsApi: {
    list: vi.fn(),
  },
}));

import { costApi } from "@/api/cost";
import { projectsApi } from "@/api/projects";

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
}

function renderPage() {
  return render(
    <MemoryRouter>
      <QueryClientProvider client={makeQueryClient()}>
        <CostPage />
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

describe("CostPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(projectsApi.list).mockResolvedValue({
      data: [
        {
          id: "p1",
          project_code: "PRJ-001",
          name: "テスト工事",
          status: "IN_PROGRESS",
          client_name: "株式会社テスト",
          start_date: "2026-01-01",
          end_date: "2026-12-31",
          budget: 1000000,
        },
      ],
      meta: { page: 1, per_page: 20, total: 1, pages: 1 },
    });
    vi.mocked(costApi.listCostRecords).mockResolvedValue({
      data: [],
      meta: { page: 1, per_page: 20, total: 0, pages: 0 },
    });
    vi.mocked(costApi.getCostSummary).mockResolvedValue({
      total_budgeted: 0,
      total_actual: 0,
      variance: 0,
      by_category: [],
    });
  });

  it("ページ見出しが表示される", () => {
    renderPage();
    expect(screen.getByText("原価管理")).toBeInTheDocument();
  });

  it("案件選択ドロップダウンが存在する", () => {
    renderPage();
    // Project selector exists
    expect(screen.getByRole("combobox")).toBeInTheDocument();
  });

  it("「新規原価記録」ボタンが表示される", () => {
    renderPage();
    expect(screen.getByRole("button", { name: /新規原価記録/ })).toBeInTheDocument();
  });

  it("プロジェクト選択後に「新規原価記録」ボタンクリックでモーダルが開く", async () => {
    const { waitFor } = await import("@testing-library/react");
    renderPage();
    // Wait for project option to appear
    await waitFor(() => {
      expect(screen.getByText("PRJ-001 - テスト工事")).toBeInTheDocument();
    });
    const select = screen.getByRole("combobox");
    fireEvent.change(select, { target: { value: "p1" } });
    const addButton = screen.getByRole("button", { name: /新規原価記録/ });
    fireEvent.click(addButton);
    expect(screen.getByText("新規原価記録作成")).toBeInTheDocument();
  });
});
