import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import ItsmPage from "./ItsmPage";

vi.mock("@/api/itsm", () => ({
  itsmApi: {
    listIncidents: vi.fn(),
    listChangeRequests: vi.fn(),
    createIncident: vi.fn(),
    createChangeRequest: vi.fn(),
    updateIncident: vi.fn(),
    updateChangeRequest: vi.fn(),
  },
}));

import { itsmApi } from "@/api/itsm";

const mockIncident = {
  id: "inc-1",
  incident_number: "INC-001",
  title: "サーバー障害",
  description: "本番サーバーが停止",
  category: "infrastructure",
  priority: "high",
  severity: "critical",
  status: "open",
  assigned_to: null,
  project_id: null,
  resolution: null,
  resolved_at: null,
  created_at: "2026-04-04T00:00:00Z",
  updated_at: "2026-04-04T00:00:00Z",
};

const mockChange = {
  id: "cr-1",
  change_number: "CHG-001",
  title: "DB スキーマ変更",
  description: "カラム追加",
  change_type: "normal",
  risk_level: "medium",
  status: "pending",
  impact: null,
  rollback_plan: null,
  created_at: "2026-04-04T00:00:00Z",
  updated_at: "2026-04-04T00:00:00Z",
};

const emptyPaginated = {
  data: [],
  meta: { page: 1, per_page: 20, total: 0, pages: 0 },
};

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
}

function renderPage() {
  return render(
    <MemoryRouter>
      <QueryClientProvider client={makeQueryClient()}>
        <ItsmPage />
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

describe("ItsmPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(itsmApi.listIncidents).mockResolvedValue(emptyPaginated);
    vi.mocked(itsmApi.listChangeRequests).mockResolvedValue(emptyPaginated);
  });

  it("ページ見出しが表示される", () => {
    renderPage();
    expect(screen.getByText("ITSM（インシデント・変更管理）")).toBeInTheDocument();
  });

  it("インシデントタブと変更要求タブが表示される", () => {
    renderPage();
    expect(screen.getByText(/インシデント管理/)).toBeInTheDocument();
    expect(screen.getByText(/変更要求管理/)).toBeInTheDocument();
  });

  it("「新規作成」ボタンが表示される", () => {
    renderPage();
    expect(screen.getByRole("button", { name: /新規作成/ })).toBeInTheDocument();
  });

  it("インシデントタブでデータなしの場合、空メッセージが表示される", async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("インシデントがありません")).toBeInTheDocument();
    });
  });

  it("「新規作成」ボタンクリックでインシデントモーダルが開く", () => {
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: /新規作成/ }));
    expect(screen.getByText("インシデント新規作成")).toBeInTheDocument();
  });

  it("インシデントモーダルのキャンセルボタンでモーダルが閉じる", () => {
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: /新規作成/ }));
    expect(screen.getByText("インシデント新規作成")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /キャンセル/ }));
    expect(screen.queryByText("インシデント新規作成")).not.toBeInTheDocument();
  });

  it("インシデントモーダルにカテゴリ・優先度・重大度フォームが含まれる", () => {
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: /新規作成/ }));
    expect(screen.getByText("タイトル")).toBeInTheDocument();
    expect(screen.getByText("カテゴリ")).toBeInTheDocument();
    expect(screen.getByText("優先度")).toBeInTheDocument();
    expect(screen.getByText("重大度")).toBeInTheDocument();
  });

  it("変更要求タブをクリックすると変更要求ビューに切り替わる", async () => {
    renderPage();
    const changesTab = screen.getByRole("button", { name: /変更要求管理/ });
    fireEvent.click(changesTab);
    await waitFor(() => {
      expect(screen.getByText("変更要求がありません")).toBeInTheDocument();
    });
  });

  it("変更要求タブで「新規作成」ボタンクリックすると変更要求モーダルが開く", async () => {
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: /変更要求管理/ }));
    fireEvent.click(screen.getByRole("button", { name: /新規作成/ }));
    expect(screen.getByText("変更要求新規作成")).toBeInTheDocument();
  });

  it("変更要求モーダルに変更タイプ・リスクフォームが含まれる", () => {
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: /変更要求管理/ }));
    fireEvent.click(screen.getByRole("button", { name: /新規作成/ }));
    expect(screen.getByText("変更タイプ")).toBeInTheDocument();
    expect(screen.getByText("リスク")).toBeInTheDocument();
  });

  it("インシデント一覧が表示される（データあり）", async () => {
    vi.mocked(itsmApi.listIncidents).mockResolvedValue({
      data: [mockIncident],
      meta: { page: 1, per_page: 20, total: 1, pages: 1 },
    });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("サーバー障害")).toBeInTheDocument();
    });
    expect(screen.getByText("INC-001")).toBeInTheDocument();
    expect(screen.getByText("infrastructure")).toBeInTheDocument();
  });

  it("インシデントのステータスバッジが表示される", async () => {
    vi.mocked(itsmApi.listIncidents).mockResolvedValue({
      data: [mockIncident],
      meta: { page: 1, per_page: 20, total: 1, pages: 1 },
    });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("オープン")).toBeInTheDocument();
    });
    expect(screen.getByText("高")).toBeInTheDocument();
    expect(screen.getByText("重大")).toBeInTheDocument();
  });

  it("インシデントの詳細/編集ボタンクリックで編集モーダルが開く", async () => {
    vi.mocked(itsmApi.listIncidents).mockResolvedValue({
      data: [mockIncident],
      meta: { page: 1, per_page: 20, total: 1, pages: 1 },
    });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("サーバー障害")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole("button", { name: /詳細\/編集/ }));
    expect(screen.getByText("インシデント編集")).toBeInTheDocument();
  });

  it("変更要求一覧が表示される（データあり）", async () => {
    vi.mocked(itsmApi.listChangeRequests).mockResolvedValue({
      data: [mockChange],
      meta: { page: 1, per_page: 20, total: 1, pages: 1 },
    });
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: /変更要求管理/ }));
    await waitFor(() => {
      expect(screen.getByText("DB スキーマ変更")).toBeInTheDocument();
    });
    expect(screen.getByText("CHG-001")).toBeInTheDocument();
  });

  it("変更要求の詳細/編集ボタンクリックで編集モーダルが開く", async () => {
    vi.mocked(itsmApi.listChangeRequests).mockResolvedValue({
      data: [mockChange],
      meta: { page: 1, per_page: 20, total: 1, pages: 1 },
    });
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: /変更要求管理/ }));
    await waitFor(() => {
      expect(screen.getByText("DB スキーマ変更")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole("button", { name: /詳細\/編集/ }));
    expect(screen.getByText("変更要求編集")).toBeInTheDocument();
  });

  it("変更要求編集モーダルのステータス選択が表示される", async () => {
    vi.mocked(itsmApi.listChangeRequests).mockResolvedValue({
      data: [mockChange],
      meta: { page: 1, per_page: 20, total: 1, pages: 1 },
    });
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: /変更要求管理/ }));
    await waitFor(() => screen.getByText("DB スキーマ変更"));
    fireEvent.click(screen.getByRole("button", { name: /詳細\/編集/ }));
    expect(screen.getByText("変更要求編集")).toBeInTheDocument();
    // ステータス選択があること
    const selects = screen.getAllByRole("combobox");
    expect(selects.length).toBeGreaterThan(0);
  });
});
