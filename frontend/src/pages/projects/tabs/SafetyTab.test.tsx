import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SafetyTab } from "./SafetyTab";

vi.mock("@/api/safety", () => ({
  safetyApi: {
    listSafetyChecks: vi.fn(),
    createSafetyCheck: vi.fn(),
    deleteSafetyCheck: vi.fn(),
  },
}));

import { safetyApi } from "@/api/safety";

const emptyList = { data: [], meta: { page: 1, per_page: 20, total: 0, pages: 0 } };

const mockChecks = {
  data: [
    {
      id: "sc1", project_id: "p1", check_date: "2026-04-04",
      check_type: "朝礼前点検", items_total: 10, items_ok: 9, items_ng: 1,
      overall_result: "PASS", notes: "足場の一部に要補修箇所あり",
      created_at: "", updated_at: "",
    },
    {
      id: "sc2", project_id: "p1", check_date: "2026-04-05",
      check_type: "定期巡回", items_total: 15, items_ok: 15, items_ng: 0,
      overall_result: "FAIL", notes: "",
      created_at: "", updated_at: "",
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
      <SafetyTab projectId="p1" />
    </QueryClientProvider>,
  );
}

describe("SafetyTab", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(safetyApi.listSafetyChecks).mockResolvedValue(emptyList);
  });

  it("データなし状態が表示される", async () => {
    renderTab();
    await waitFor(() => {
      expect(screen.getByText("安全チェックがまだありません")).toBeInTheDocument();
    });
  });

  it("「安全チェック一覧」見出しが表示される", async () => {
    renderTab();
    await waitFor(() => {
      expect(screen.getByText("安全チェック一覧")).toBeInTheDocument();
    });
  });

  it("安全チェックデータが表示される", async () => {
    vi.mocked(safetyApi.listSafetyChecks).mockResolvedValue(mockChecks);
    renderTab();
    await waitFor(() => {
      expect(screen.getByText("2026-04-04")).toBeInTheDocument();
    });
    expect(screen.getByText("朝礼前点検")).toBeInTheDocument();
    expect(screen.getByText("2026-04-05")).toBeInTheDocument();
    expect(screen.getByText("定期巡回")).toBeInTheDocument();
  });

  it("合格/不合格が表示される", async () => {
    vi.mocked(safetyApi.listSafetyChecks).mockResolvedValue(mockChecks);
    renderTab();
    await waitFor(() => {
      expect(screen.getByText("合格")).toBeInTheDocument();
    });
    expect(screen.getByText("不合格")).toBeInTheDocument();
  });

  it("項目数が表示される", async () => {
    vi.mocked(safetyApi.listSafetyChecks).mockResolvedValue(mockChecks);
    renderTab();
    await waitFor(() => {
      expect(screen.getByText(/全10項目/)).toBeInTheDocument();
    });
  });

  it("備考が表示される", async () => {
    vi.mocked(safetyApi.listSafetyChecks).mockResolvedValue(mockChecks);
    renderTab();
    await waitFor(() => {
      expect(screen.getByText("足場の一部に要補修箇所あり")).toBeInTheDocument();
    });
  });

  it("「新規作成」クリックでモーダルが開く", async () => {
    renderTab();
    await waitFor(() => screen.getByRole("button", { name: /新規作成/ }));
    fireEvent.click(screen.getByRole("button", { name: /新規作成/ }));
    expect(screen.getByText("安全チェックを作成")).toBeInTheDocument();
  });

  it("モーダルで日付が空の場合、作成ボタンが無効", async () => {
    renderTab();
    await waitFor(() => screen.getByRole("button", { name: /新規作成/ }));
    fireEvent.click(screen.getByRole("button", { name: /新規作成/ }));
    const createBtn = screen.getByRole("button", { name: /^作成$/ });
    expect(createBtn).toBeDisabled();
  });

  it("削除ボタンをクリックすると確認後に API が呼ばれる", async () => {
    vi.mocked(safetyApi.listSafetyChecks).mockResolvedValue(mockChecks);
    vi.mocked(safetyApi.deleteSafetyCheck).mockResolvedValue(undefined);
    window.confirm = vi.fn(() => true);
    renderTab();
    await waitFor(() => screen.getByText("2026-04-04"));
    const deleteBtns = screen.getAllByTitle("削除");
    fireEvent.click(deleteBtns[0]);
    expect(window.confirm).toHaveBeenCalled();
    await waitFor(() => {
      expect(safetyApi.deleteSafetyCheck).toHaveBeenCalledWith("p1", "sc1");
    });
  });
});
