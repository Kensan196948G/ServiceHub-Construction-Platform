import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import ProjectsPage from "./ProjectsPage";

vi.mock("@/api/projects", () => ({
  projectsApi: {
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    get: vi.fn(),
  },
}));

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
        <ProjectsPage />
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

describe("ProjectsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("ローディング中はスケルトンが表示される", () => {
    vi.mocked(projectsApi.list).mockImplementation(() => new Promise(() => {}));
    renderPage();
    // Heading is always present
    expect(screen.getByText("工事案件一覧")).toBeInTheDocument();
  });

  it("データ取得後にプロジェクト一覧が表示される", async () => {
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

    renderPage();

    await waitFor(() => {
      expect(screen.getByText("テスト工事")).toBeInTheDocument();
    });
    expect(screen.getByText("PRJ-001")).toBeInTheDocument();
  });

  it("データが空の場合に空状態メッセージが表示される", async () => {
    vi.mocked(projectsApi.list).mockResolvedValue({
      data: [],
      meta: { page: 1, per_page: 20, total: 0, pages: 0 },
    });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText("案件がありません")).toBeInTheDocument();
    });
  });

  it("「新規案件」ボタンクリックでモーダルが開く", async () => {
    vi.mocked(projectsApi.list).mockResolvedValue({
      data: [],
      meta: { page: 1, per_page: 20, total: 0, pages: 0 },
    });

    renderPage();

    const addButton = screen.getByRole("button", { name: /新規案件/ });
    fireEvent.click(addButton);

    expect(screen.getByText("新規工事案件")).toBeInTheDocument();
  });

  it("検索入力フィールドが存在する", () => {
    vi.mocked(projectsApi.list).mockResolvedValue({
      data: [],
      meta: { page: 1, per_page: 20, total: 0, pages: 0 },
    });

    renderPage();

    expect(screen.getByPlaceholderText(/案件名・コード/)).toBeInTheDocument();
  });
});
