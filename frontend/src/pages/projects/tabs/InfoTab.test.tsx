import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { InfoTab } from "./InfoTab";

vi.mock("@/api/projects", () => ({
  projectsApi: {
    update: vi.fn(),
  },
}));

import { projectsApi } from "@/api/projects";
import type { Project } from "@/api/projects";

const mockProject: Project = {
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
  manager_id: null,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
}

function renderTab(project = mockProject) {
  return render(
    <QueryClientProvider client={makeQueryClient()}>
      <InfoTab project={project} projectId={project.id} />
    </QueryClientProvider>,
  );
}

describe("InfoTab", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("基本情報が表示される", () => {
    renderTab();
    expect(screen.getByText("基本情報")).toBeInTheDocument();
    expect(screen.getByText("PC-001")).toBeInTheDocument();
    expect(screen.getByText("テスト施主")).toBeInTheDocument();
    expect(screen.getByText("東京都渋谷区")).toBeInTheDocument();
  });

  it("ステータスバッジが表示される", () => {
    renderTab();
    expect(screen.getByText("進行中")).toBeInTheDocument();
  });

  it("予算がフォーマットされて表示される", () => {
    renderTab();
    expect(screen.getByText("¥10,000,000")).toBeInTheDocument();
  });

  it("日付が表示される", () => {
    renderTab();
    expect(screen.getByText("2026-01-01")).toBeInTheDocument();
    expect(screen.getByText("2026-12-31")).toBeInTheDocument();
  });

  it("null値は「—」で表示される", () => {
    const project = { ...mockProject, site_address: null, budget: null };
    renderTab(project);
    const dashes = screen.getAllByText("—");
    expect(dashes.length).toBeGreaterThan(0);
  });

  it("編集ボタンをクリックすると編集モードになる", () => {
    renderTab();
    fireEvent.click(screen.getByRole("button", { name: /編集/ }));
    expect(screen.getByText("基本情報を編集")).toBeInTheDocument();
  });

  it("編集モードでフォームフィールドが表示される", () => {
    renderTab();
    fireEvent.click(screen.getByRole("button", { name: /編集/ }));
    expect(screen.getByLabelText("案件コード")).toBeInTheDocument();
    expect(screen.getByLabelText("案件名")).toBeInTheDocument();
    expect(screen.getByLabelText("施主名")).toBeInTheDocument();
  });

  it("キャンセルボタンで閲覧モードに戻る", () => {
    renderTab();
    fireEvent.click(screen.getByRole("button", { name: /編集/ }));
    expect(screen.getByText("基本情報を編集")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /キャンセル/ }));
    expect(screen.getByText("基本情報")).toBeInTheDocument();
    expect(screen.queryByText("基本情報を編集")).not.toBeInTheDocument();
  });

  it("保存ボタンをクリックすると API が呼ばれる", async () => {
    vi.mocked(projectsApi.update).mockResolvedValue(mockProject);
    renderTab();
    fireEvent.click(screen.getByRole("button", { name: /編集/ }));
    fireEvent.click(screen.getByRole("button", { name: /保存/ }));
    await waitFor(() => {
      expect(projectsApi.update).toHaveBeenCalledWith("p1", expect.any(Object));
    });
  });
});
