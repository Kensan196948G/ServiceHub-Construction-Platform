import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import KnowledgePage from "./KnowledgePage";

vi.mock("@/api/knowledge", () => ({
  knowledgeApi: {
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    search: vi.fn(),
  },
}));

import { knowledgeApi } from "@/api/knowledge";

const mockArticle = {
  id: "a1",
  title: "安全作業マニュアル",
  category: "SAFETY",
  content: "作業前の確認事項について説明します。",
  tags: "安全,確認",
  is_published: true,
  view_count: 10,
  rating: 4.5,
  created_at: "",
  updated_at: "",
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
        <KnowledgePage />
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

describe("KnowledgePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(knowledgeApi.list).mockResolvedValue({
      data: [],
      meta: { page: 1, per_page: 100, total: 0, pages: 0 },
    });
  });

  it("ページ見出しが表示される", () => {
    renderPage();
    expect(screen.getByText("AIナレッジベース")).toBeInTheDocument();
  });

  it("「新規記事作成」ボタンが存在する", () => {
    renderPage();
    expect(screen.getByRole("button", { name: /新規記事作成/ })).toBeInTheDocument();
  });

  it("AI検索エリアが存在する", () => {
    renderPage();
    expect(screen.getAllByText("AI検索").length).toBeGreaterThan(0);
    expect(screen.getByPlaceholderText(/質問を入力してください/)).toBeInTheDocument();
  });

  it("カテゴリフィルタードロップダウンが存在する", () => {
    renderPage();
    expect(screen.getByRole("combobox")).toBeInTheDocument();
  });

  it("キーワード検索入力フィールドが存在する", () => {
    renderPage();
    expect(screen.getByPlaceholderText(/キーワード検索/)).toBeInTheDocument();
  });

  it("データなしの場合、空メッセージが表示される", async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("記事が見つかりません")).toBeInTheDocument();
    });
  });

  it("「新規記事作成」ボタンクリックでモーダルが開く", () => {
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: /新規記事作成/ }));
    expect(screen.getByText("新規記事作成", { selector: "h3" })).toBeInTheDocument();
  });

  it("新規記事作成モーダルのキャンセルでモーダルが閉じる", () => {
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: /新規記事作成/ }));
    expect(screen.getByText("新規記事作成", { selector: "h3" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /キャンセル/ }));
    expect(screen.queryByText("新規記事作成", { selector: "h3" })).not.toBeInTheDocument();
  });

  it("新規記事作成モーダルにタイトル・カテゴリ・内容フォームが含まれる", () => {
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: /新規記事作成/ }));
    expect(screen.getByText("タイトル")).toBeInTheDocument();
    expect(screen.getByText("カテゴリ")).toBeInTheDocument();
    expect(screen.getByText("内容")).toBeInTheDocument();
  });

  it("記事データが表示される", async () => {
    vi.mocked(knowledgeApi.list).mockResolvedValue({
      data: [mockArticle],
      meta: { page: 1, per_page: 100, total: 1, pages: 1 },
    });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("安全作業マニュアル")).toBeInTheDocument();
    });
    expect(screen.getAllByText("安全").length).toBeGreaterThan(0);
  });

  it("記事クリックで詳細モーダルが開く", async () => {
    vi.mocked(knowledgeApi.list).mockResolvedValue({
      data: [mockArticle],
      meta: { page: 1, per_page: 100, total: 1, pages: 1 },
    });
    renderPage();
    await waitFor(() => screen.getByText("安全作業マニュアル"));
    fireEvent.click(screen.getByText("安全作業マニュアル"));
    expect(screen.getAllByText(/作業前の確認事項/).length).toBeGreaterThan(0);
  });

  it("詳細モーダルに編集ボタンと削除ボタンが存在する", async () => {
    vi.mocked(knowledgeApi.list).mockResolvedValue({
      data: [mockArticle],
      meta: { page: 1, per_page: 100, total: 1, pages: 1 },
    });
    renderPage();
    await waitFor(() => screen.getByText("安全作業マニュアル"));
    fireEvent.click(screen.getByText("安全作業マニュアル"));
    expect(screen.getByRole("button", { name: /編集/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /削除/ })).toBeInTheDocument();
  });

  it("詳細モーダルの編集ボタンで編集モードに切り替わる", async () => {
    vi.mocked(knowledgeApi.list).mockResolvedValue({
      data: [mockArticle],
      meta: { page: 1, per_page: 100, total: 1, pages: 1 },
    });
    renderPage();
    await waitFor(() => screen.getByText("安全作業マニュアル"));
    fireEvent.click(screen.getByText("安全作業マニュアル"));
    fireEvent.click(screen.getByRole("button", { name: /編集/ }));
    expect(screen.getByRole("button", { name: /保存/ })).toBeInTheDocument();
  });

  it("カテゴリフィルターで記事を絞り込める", async () => {
    vi.mocked(knowledgeApi.list).mockResolvedValue({
      data: [mockArticle],
      meta: { page: 1, per_page: 100, total: 1, pages: 1 },
    });
    renderPage();
    await waitFor(() => screen.getByText("安全作業マニュアル"));
    // QUALITYに切り替えるとSAFETY記事が非表示になる
    const select = screen.getByRole("combobox");
    fireEvent.change(select, { target: { value: "QUALITY" } });
    expect(screen.getByText("記事が見つかりません")).toBeInTheDocument();
  });

  it("非公開記事に「非公開」バッジが表示される", async () => {
    vi.mocked(knowledgeApi.list).mockResolvedValue({
      data: [{ ...mockArticle, is_published: false }],
      meta: { page: 1, per_page: 100, total: 1, pages: 1 },
    });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("非公開")).toBeInTheDocument();
    });
  });
});
