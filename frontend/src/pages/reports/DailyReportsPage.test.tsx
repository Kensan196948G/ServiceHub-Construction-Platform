import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import DailyReportsPage from "./DailyReportsPage";

vi.mock("@/api/daily_reports", () => ({
  dailyReportsApi: {
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    get: vi.fn(),
  },
}));

vi.mock("@/api/projects", () => ({
  projectsApi: {
    list: vi.fn(),
  },
}));

import { dailyReportsApi } from "@/api/daily_reports";
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
        <DailyReportsPage />
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

describe("DailyReportsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(projectsApi.list).mockResolvedValue({
      data: [],
      meta: { page: 1, per_page: 20, total: 0, pages: 0 },
    });
    vi.mocked(dailyReportsApi.list).mockResolvedValue({
      data: [],
      meta: { page: 1, per_page: 20, total: 0, pages: 0 },
    });
  });

  it("ページ見出しが表示される", () => {
    renderPage();
    expect(screen.getByText("日報管理")).toBeInTheDocument();
  });

  it("「新規日報」ボタンが存在する", () => {
    renderPage();
    expect(screen.getByRole("button", { name: /新規日報/ })).toBeInTheDocument();
  });

  it("「新規日報」ボタンクリックでモーダルが開く", () => {
    renderPage();
    const addButton = screen.getByRole("button", { name: /新規日報/ });
    fireEvent.click(addButton);
    expect(screen.getByText("新規日報作成")).toBeInTheDocument();
  });

  it("案件選択ドロップダウンが存在する", () => {
    renderPage();
    expect(screen.getByRole("combobox")).toBeInTheDocument();
  });

  it("プロジェクト未選択時は「新規日報」ボタンが無効化される", () => {
    renderPage();
    const btn = screen.getByRole("button", { name: /新規日報/ });
    expect(btn).toBeDisabled();
  });

  it("プロジェクト一覧がドロップダウンに表示される", async () => {
    vi.mocked(projectsApi.list).mockResolvedValue({
      data: [{ id: "p1", project_code: "PC-001", name: "テスト案件", status: "active", created_at: "" }],
      meta: { page: 1, per_page: 20, total: 1, pages: 1 },
    });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("PC-001 - テスト案件")).toBeInTheDocument();
    });
  });

  it("モーダルにタイトルと送信ボタンが表示される", () => {
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: /新規日報/ }));
    expect(screen.getByText("新規日報作成")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /作成/ })).toBeInTheDocument();
  });

  it("モーダルのキャンセルボタンでモーダルが閉じる", async () => {
    vi.mocked(projectsApi.list).mockResolvedValue({
      data: [{ id: "p1", project_code: "PC-001", name: "テスト案件", status: "active", created_at: "" }],
      meta: { page: 1, per_page: 20, total: 1, pages: 1 },
    });
    renderPage();
    await waitFor(() => screen.getByText("PC-001 - テスト案件"));
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "p1" } });
    fireEvent.click(screen.getByRole("button", { name: /新規日報/ }));
    expect(screen.getByText("新規日報作成", { selector: "h3" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /キャンセル/ }));
    expect(screen.queryByText("新規日報作成", { selector: "h3" })).not.toBeInTheDocument();
  });

  it("モーダルに天気・作業員数フォームが含まれる", async () => {
    vi.mocked(projectsApi.list).mockResolvedValue({
      data: [{ id: "p1", project_code: "PC-001", name: "テスト案件", status: "active", created_at: "" }],
      meta: { page: 1, per_page: 20, total: 1, pages: 1 },
    });
    renderPage();
    await waitFor(() => screen.getByText("PC-001 - テスト案件"));
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "p1" } });
    fireEvent.click(screen.getByRole("button", { name: /新規日報/ }));
    expect(screen.getByText("天気")).toBeInTheDocument();
    expect(screen.getByText("作業員数")).toBeInTheDocument();
  });

  it("プロジェクト選択後に日報一覧が表示される（データなし）", async () => {
    vi.mocked(projectsApi.list).mockResolvedValue({
      data: [{ id: "p1", project_code: "PC-001", name: "テスト案件", status: "active", created_at: "" }],
      meta: { page: 1, per_page: 20, total: 1, pages: 1 },
    });
    renderPage();
    await waitFor(() => screen.getByText("PC-001 - テスト案件"));
    const select = screen.getByRole("combobox");
    fireEvent.change(select, { target: { value: "p1" } });
    await waitFor(() => {
      expect(screen.getByText(/日報がまだありません/)).toBeInTheDocument();
    });
  });

  it("日報データが表示される", async () => {
    vi.mocked(projectsApi.list).mockResolvedValue({
      data: [{ id: "p1", project_code: "PC-001", name: "テスト案件", status: "active", created_at: "" }],
      meta: { page: 1, per_page: 20, total: 1, pages: 1 },
    });
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
    await waitFor(() => screen.getByText("PC-001 - テスト案件"));
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "p1" } });
    await waitFor(() => {
      expect(screen.getByText("2026-04-04")).toBeInTheDocument();
    });
  });
});
