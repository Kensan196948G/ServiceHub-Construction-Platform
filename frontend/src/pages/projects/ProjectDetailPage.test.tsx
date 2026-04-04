import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import ProjectDetailPage from "./ProjectDetailPage";

vi.mock("@/api/projects", () => ({
  projectsApi: {
    get: vi.fn(),
    update: vi.fn(),
  },
}));

vi.mock("@/api/daily_reports", () => ({
  dailyReportsApi: {
    list: vi.fn(),
    create: vi.fn(),
    delete: vi.fn(),
    update: vi.fn(),
  },
}));

vi.mock("@/api/safety", () => ({
  safetyApi: {
    listSafetyChecks: vi.fn(),
    createSafetyCheck: vi.fn(),
    deleteSafetyCheck: vi.fn(),
  },
}));

vi.mock("@/api/cost", () => ({
  costApi: {
    listCostRecords: vi.fn(),
    getCostSummary: vi.fn(),
    createCostRecord: vi.fn(),
    deleteCostRecord: vi.fn(),
  },
}));

vi.mock("@/api/photos", () => ({
  fetchPhotos: vi.fn(),
  uploadPhoto: vi.fn(),
  deletePhoto: vi.fn(),
}));

import { projectsApi } from "@/api/projects";
import { dailyReportsApi } from "@/api/daily_reports";
import { safetyApi } from "@/api/safety";
import { costApi } from "@/api/cost";
import { fetchPhotos } from "@/api/photos";

const mockProject = {
  id: "p1",
  project_code: "PC-001",
  name: "テストプロジェクト",
  client_name: "テスト施主",
  site_address: "東京都渋谷区",
  status: "IN_PROGRESS",
  start_date: "2026-01-01",
  end_date: "2026-12-31",
  budget: 10000000,
  description: "テスト用の案件です。",
  created_at: "",
};

const emptyList = {
  data: [],
  meta: { page: 1, per_page: 20, total: 0, pages: 0 },
};

const emptyCostSummary = {
  total_budgeted: 0,
  total_actual: 0,
  variance: 0,
  variance_rate: 0,
  by_category: {},
};

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/projects/p1"]}>
      <QueryClientProvider client={makeQueryClient()}>
        <Routes>
          <Route path="/projects/:id" element={<ProjectDetailPage />} />
        </Routes>
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

describe("ProjectDetailPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(projectsApi.get).mockResolvedValue(mockProject);
    vi.mocked(dailyReportsApi.list).mockResolvedValue(emptyList);
    vi.mocked(safetyApi.listSafetyChecks).mockResolvedValue(emptyList);
    vi.mocked(costApi.listCostRecords).mockResolvedValue(emptyList);
    vi.mocked(costApi.getCostSummary).mockResolvedValue(emptyCostSummary);
    vi.mocked(fetchPhotos).mockResolvedValue([]);
  });

  it("プロジェクト名が表示される", async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("テストプロジェクト")).toBeInTheDocument();
    });
  });

  it("案件コードが表示される", async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getAllByText("PC-001").length).toBeGreaterThan(0);
    });
  });

  it("ステータスバッジ「進行中」が表示される", async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("進行中")).toBeInTheDocument();
    });
  });

  it("5つのタブが表示される", async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getAllByText("基本情報").length).toBeGreaterThan(0);
    });
    expect(screen.getByText("日報")).toBeInTheDocument();
    expect(screen.getByText("安全チェック")).toBeInTheDocument();
    expect(screen.getByText("原価")).toBeInTheDocument();
    expect(screen.getByText("写真")).toBeInTheDocument();
  });

  it("基本情報タブが初期表示される（施主名が表示）", async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getAllByText("基本情報").length).toBeGreaterThan(0);
    });
    // 施主名が表示されていること
    expect(screen.getByText("テスト施主")).toBeInTheDocument();
  });

  it("日報タブに切り替えるとデータなし状態が表示される", async () => {
    renderPage();
    await waitFor(() => screen.getByText("テストプロジェクト"));
    fireEvent.click(screen.getByText("日報"));
    await waitFor(() => {
      expect(screen.getByText("日報がまだありません")).toBeInTheDocument();
    });
  });

  it("安全チェックタブに切り替えるとデータなし状態が表示される", async () => {
    renderPage();
    await waitFor(() => screen.getByText("テストプロジェクト"));
    fireEvent.click(screen.getByText("安全チェック"));
    await waitFor(() => {
      expect(screen.getByText("安全チェックがまだありません")).toBeInTheDocument();
    });
  });

  it("原価タブに切り替えるとデータなし状態が表示される", async () => {
    renderPage();
    await waitFor(() => screen.getByText("テストプロジェクト"));
    fireEvent.click(screen.getByText("原価"));
    await waitFor(() => {
      expect(screen.getByText("原価記録がまだありません")).toBeInTheDocument();
    });
  });

  it("写真タブに切り替えるとデータなし状態が表示される", async () => {
    renderPage();
    await waitFor(() => screen.getByText("テストプロジェクト"));
    fireEvent.click(screen.getByText("写真"));
    await waitFor(() => {
      expect(screen.getByText("写真がまだありません")).toBeInTheDocument();
    });
  });

  it("案件が見つからない場合、エラーメッセージが表示される", async () => {
    vi.mocked(projectsApi.get).mockResolvedValue(null as unknown as typeof mockProject);
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("案件が見つかりません")).toBeInTheDocument();
    });
  });

  it("日報タブに「新規作成」ボタンが表示される", async () => {
    renderPage();
    await waitFor(() => screen.getByText("テストプロジェクト"));
    fireEvent.click(screen.getByText("日報"));
    await waitFor(() => {
      expect(screen.getByText("日報がまだありません")).toBeInTheDocument();
    });
    expect(screen.getByRole("button", { name: /新規作成/ })).toBeInTheDocument();
  });

  it("日報タブ「新規作成」クリックでモーダルが開く", async () => {
    renderPage();
    await waitFor(() => screen.getByText("テストプロジェクト"));
    fireEvent.click(screen.getByText("日報"));
    await waitFor(() => screen.getByText("日報がまだありません"));
    fireEvent.click(screen.getByRole("button", { name: /新規作成/ }));
    expect(screen.getByText("日報を作成")).toBeInTheDocument();
  });

  it("安全チェックタブに「新規作成」ボタンが表示される", async () => {
    renderPage();
    await waitFor(() => screen.getByText("テストプロジェクト"));
    fireEvent.click(screen.getByText("安全チェック"));
    await waitFor(() => screen.getByText("安全チェックがまだありません"));
    expect(screen.getByRole("button", { name: /新規作成/ })).toBeInTheDocument();
  });

  it("日報データが表示される", async () => {
    vi.mocked(dailyReportsApi.list).mockResolvedValue({
      data: [{
        id: "r1", project_id: "p1", report_date: "2026-04-04",
        weather: "SUNNY", worker_count: 5, progress_rate: 50,
        safety_check: true, status: "draft", work_content: "基礎工事",
        safety_notes: "", issues: "", created_at: "", updated_at: "",
      }],
      meta: { page: 1, per_page: 20, total: 1, pages: 1 },
    });
    renderPage();
    await waitFor(() => screen.getByText("テストプロジェクト"));
    fireEvent.click(screen.getByText("日報"));
    await waitFor(() => {
      expect(screen.getByText("2026-04-04")).toBeInTheDocument();
    });
  });

  it("安全チェックデータが表示される", async () => {
    vi.mocked(safetyApi.listSafetyChecks).mockResolvedValue({
      data: [{
        id: "sc1", project_id: "p1", check_date: "2026-04-04",
        check_type: "DAILY", items_total: 10, items_ok: 9, items_ng: 1,
        overall_result: "合格", notes: "", created_at: "", updated_at: "",
      }],
      meta: { page: 1, per_page: 20, total: 1, pages: 1 },
    });
    renderPage();
    await waitFor(() => screen.getByText("テストプロジェクト"));
    fireEvent.click(screen.getByText("安全チェック"));
    await waitFor(() => {
      expect(screen.getByText("2026-04-04")).toBeInTheDocument();
    });
  });

  it("基本情報タブの「編集」ボタンで編集モードに切り替わる", async () => {
    renderPage();
    await waitFor(() => screen.getByText("テストプロジェクト"));
    fireEvent.click(screen.getByRole("button", { name: /編集/ }));
    await waitFor(() => {
      expect(screen.getByText("基本情報を編集")).toBeInTheDocument();
    });
  });
});
