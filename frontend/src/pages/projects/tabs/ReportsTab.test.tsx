import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReportsTab } from "./ReportsTab";

vi.mock("@/api/daily_reports", () => ({
  dailyReportsApi: {
    list: vi.fn(),
    create: vi.fn(),
    delete: vi.fn(),
    update: vi.fn(),
  },
}));

import { dailyReportsApi } from "@/api/daily_reports";

const emptyList = { data: [], meta: { page: 1, per_page: 20, total: 0, pages: 0 } };

const mockReports = {
  data: [
    {
      id: "r1", project_id: "p1", report_date: "2026-04-04",
      weather: "SUNNY", worker_count: 5, progress_rate: 50,
      safety_check: true, status: "draft", work_content: "基礎工事",
      safety_notes: "", issues: "地盤の一部に軟弱箇所", created_at: "", updated_at: "",
    },
    {
      id: "r2", project_id: "p1", report_date: "2026-04-05",
      weather: "CLOUDY", worker_count: 8, progress_rate: 65,
      safety_check: true, status: "draft", work_content: "鉄筋組立",
      safety_notes: "", issues: "", created_at: "", updated_at: "",
    },
  ],
  meta: { page: 1, per_page: 20, total: 2, pages: 1 },
};

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
}

function renderTab() {
  return render(
    <QueryClientProvider client={makeQueryClient()}>
      <ReportsTab projectId="p1" />
    </QueryClientProvider>,
  );
}

describe("ReportsTab", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(dailyReportsApi.list).mockResolvedValue(emptyList);
  });

  it("データなし状態が表示される", async () => {
    renderTab();
    await waitFor(() => {
      expect(screen.getByText("日報がまだありません")).toBeInTheDocument();
    });
  });

  it("「日報一覧」見出しが表示される", async () => {
    renderTab();
    await waitFor(() => {
      expect(screen.getByText("日報一覧")).toBeInTheDocument();
    });
  });

  it("「新規作成」ボタンが表示される", async () => {
    renderTab();
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /新規作成/ })).toBeInTheDocument();
    });
  });

  it("日報データが表示される", async () => {
    vi.mocked(dailyReportsApi.list).mockResolvedValue(mockReports);
    renderTab();
    await waitFor(() => {
      expect(screen.getByText("2026-04-04")).toBeInTheDocument();
    });
    expect(screen.getByText("基礎工事")).toBeInTheDocument();
    expect(screen.getByText("2026-04-05")).toBeInTheDocument();
    expect(screen.getByText("鉄筋組立")).toBeInTheDocument();
  });

  it("進捗率が表示される", async () => {
    vi.mocked(dailyReportsApi.list).mockResolvedValue(mockReports);
    renderTab();
    await waitFor(() => {
      expect(screen.getByText("50%")).toBeInTheDocument();
    });
    expect(screen.getByText("65%")).toBeInTheDocument();
  });

  it("課題が黄色いセクションで表示される", async () => {
    vi.mocked(dailyReportsApi.list).mockResolvedValue(mockReports);
    renderTab();
    await waitFor(() => {
      expect(screen.getByText("地盤の一部に軟弱箇所")).toBeInTheDocument();
    });
    expect(screen.getByText("課題")).toBeInTheDocument();
  });

  it("「新規作成」クリックでモーダルが開く", async () => {
    renderTab();
    await waitFor(() => screen.getByRole("button", { name: /新規作成/ }));
    fireEvent.click(screen.getByRole("button", { name: /新規作成/ }));
    expect(screen.getByText("日報を作成")).toBeInTheDocument();
  });

  it("モーダルで日付が空の場合、作成ボタンが無効", async () => {
    renderTab();
    await waitFor(() => screen.getByRole("button", { name: /新規作成/ }));
    fireEvent.click(screen.getByRole("button", { name: /新規作成/ }));
    const createBtn = screen.getByRole("button", { name: /^作成$/ });
    expect(createBtn).toBeDisabled();
  });

  it("削除ボタンをクリックすると確認後に API が呼ばれる", async () => {
    vi.mocked(dailyReportsApi.list).mockResolvedValue(mockReports);
    vi.mocked(dailyReportsApi.delete).mockResolvedValue(undefined);
    window.confirm = vi.fn(() => true);
    renderTab();
    await waitFor(() => screen.getByText("2026-04-04"));
    const deleteBtns = screen.getAllByTitle("削除");
    fireEvent.click(deleteBtns[0]);
    expect(window.confirm).toHaveBeenCalled();
    await waitFor(() => {
      expect(dailyReportsApi.delete).toHaveBeenCalledWith("p1", "r1");
    });
  });

  it("編集ボタンをクリックすると編集モーダルが開く", async () => {
    vi.mocked(dailyReportsApi.list).mockResolvedValue(mockReports);
    renderTab();
    await waitFor(() => screen.getByText("2026-04-04"));
    const editBtns = screen.getAllByTitle("編集");
    fireEvent.click(editBtns[0]);
    expect(screen.getByText("日報を編集")).toBeInTheDocument();
  });
});
