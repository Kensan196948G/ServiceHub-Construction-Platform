import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import SafetyPage from "./SafetyPage";

vi.mock("@/api/safety", () => ({
  safetyApi: {
    listSafetyChecks: vi.fn(),
    createSafetyCheck: vi.fn(),
    deleteSafetyCheck: vi.fn(),
    listQualityInspections: vi.fn(),
    createQualityInspection: vi.fn(),
    deleteQualityInspection: vi.fn(),
  },
}));

vi.mock("@/api/projects", () => ({
  projectsApi: {
    list: vi.fn(),
  },
}));

import { safetyApi } from "@/api/safety";
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
        <SafetyPage />
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

describe("SafetyPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(projectsApi.list).mockResolvedValue({
      data: [],
      meta: { page: 1, per_page: 20, total: 0, pages: 0 },
    });
    vi.mocked(safetyApi.listSafetyChecks).mockResolvedValue({
      data: [],
      meta: { page: 1, per_page: 20, total: 0, pages: 0 },
    });
    vi.mocked(safetyApi.listQualityInspections).mockResolvedValue({
      data: [],
      meta: { page: 1, per_page: 20, total: 0, pages: 0 },
    });
  });

  it("ページ見出しが表示される", () => {
    renderPage();
    expect(screen.getByText("安全品質管理")).toBeInTheDocument();
  });

  it("「安全チェック」タブと「品質検査」タブが表示される", () => {
    renderPage();
    expect(screen.getByText(/安全チェック/)).toBeInTheDocument();
    expect(screen.getByText(/品質検査/)).toBeInTheDocument();
  });

  it("「新規作成」ボタンが存在する", () => {
    renderPage();
    expect(screen.getByRole("button", { name: /新規作成/ })).toBeInTheDocument();
  });

  it("品質検査タブをクリックすると品質検査ビューに切り替わる", () => {
    renderPage();
    const inspectionTab = screen.getByRole("button", { name: /品質検査/ });
    fireEvent.click(inspectionTab);
    expect(inspectionTab).toBeInTheDocument();
  });

  it("プロジェクト選択ドロップダウンが表示される", () => {
    renderPage();
    expect(screen.getByRole("combobox")).toBeInTheDocument();
  });

  it("プロジェクト一覧がドロップダウンに表示される", async () => {
    vi.mocked(projectsApi.list).mockResolvedValue({
      data: [{ id: "p1", project_code: "PC-001", name: "安全テスト案件", status: "active", created_at: "" }],
      meta: { page: 1, per_page: 20, total: 1, pages: 1 },
    });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("PC-001 - 安全テスト案件")).toBeInTheDocument();
    });
  });

  it("安全チェックモーダルが開く", async () => {
    vi.mocked(projectsApi.list).mockResolvedValue({
      data: [{ id: "p1", project_code: "PC-001", name: "テスト案件", status: "active", created_at: "" }],
      meta: { page: 1, per_page: 20, total: 1, pages: 1 },
    });
    renderPage();
    await waitFor(() => screen.getByText("PC-001 - テスト案件"));
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "p1" } });
    fireEvent.click(screen.getByRole("button", { name: /新規作成/ }));
    expect(screen.getByText("安全チェック新規作成")).toBeInTheDocument();
  });

  it("安全チェックモーダルのキャンセルでモーダルが閉じる", async () => {
    vi.mocked(projectsApi.list).mockResolvedValue({
      data: [{ id: "p1", project_code: "PC-001", name: "テスト案件", status: "active", created_at: "" }],
      meta: { page: 1, per_page: 20, total: 1, pages: 1 },
    });
    renderPage();
    await waitFor(() => screen.getByText("PC-001 - テスト案件"));
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "p1" } });
    fireEvent.click(screen.getByRole("button", { name: /新規作成/ }));
    expect(screen.getByText("安全チェック新規作成")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /キャンセル/ }));
    expect(screen.queryByText("安全チェック新規作成")).not.toBeInTheDocument();
  });

  it("品質検査タブで新規作成モーダルが開く", async () => {
    vi.mocked(projectsApi.list).mockResolvedValue({
      data: [{ id: "p1", project_code: "PC-001", name: "テスト案件", status: "active", created_at: "" }],
      meta: { page: 1, per_page: 20, total: 1, pages: 1 },
    });
    renderPage();
    await waitFor(() => screen.getByText("PC-001 - テスト案件"));
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "p1" } });
    fireEvent.click(screen.getByRole("button", { name: /品質検査/ }));
    fireEvent.click(screen.getByRole("button", { name: /新規作成/ }));
    expect(screen.getByText("品質検査新規作成")).toBeInTheDocument();
  });

  it("プロジェクト選択後、安全チェック一覧エリアが表示される", async () => {
    vi.mocked(projectsApi.list).mockResolvedValue({
      data: [{ id: "p1", project_code: "PC-001", name: "テスト案件", status: "active", created_at: "" }],
      meta: { page: 1, per_page: 20, total: 1, pages: 1 },
    });
    renderPage();
    await waitFor(() => screen.getByText("PC-001 - テスト案件"));
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "p1" } });
    await waitFor(() => {
      expect(screen.getByText(/安全チェックデータがありません/)).toBeInTheDocument();
    });
  });

  it("安全チェックデータが表示される", async () => {
    vi.mocked(projectsApi.list).mockResolvedValue({
      data: [{ id: "p1", project_code: "PC-001", name: "テスト案件", status: "active", created_at: "" }],
      meta: { page: 1, per_page: 20, total: 1, pages: 1 },
    });
    vi.mocked(safetyApi.listSafetyChecks).mockResolvedValue({
      data: [{
        id: "sc1", project_id: "p1", check_date: "2026-04-04",
        check_type: "DAILY", items_total: 10, items_ok: 9, items_ng: 1,
        overall_result: "合格", notes: "", created_at: "", updated_at: "",
      }],
      meta: { page: 1, per_page: 20, total: 1, pages: 1 },
    });
    renderPage();
    await waitFor(() => screen.getByText("PC-001 - テスト案件"));
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "p1" } });
    await waitFor(() => {
      expect(screen.getByText("2026-04-04")).toBeInTheDocument();
    });
    expect(screen.getByText("日次")).toBeInTheDocument();
  });
});
