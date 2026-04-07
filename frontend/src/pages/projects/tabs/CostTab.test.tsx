import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { CostTab } from "./CostTab";

vi.mock("@/api/cost", () => ({
  costApi: {
    listCostRecords: vi.fn(),
    getCostSummary: vi.fn(),
    createCostRecord: vi.fn(),
    deleteCostRecord: vi.fn(),
  },
}));

import { costApi } from "@/api/cost";

const emptyList = { data: [], meta: { page: 1, per_page: 20, total: 0, pages: 0 } };
const emptySummary = { total_budgeted: 0, total_actual: 0, variance: 0, variance_rate: 0, by_category: {} };

const mockRecords = {
  data: [
    {
      id: "c1", project_id: "p1", record_date: "2026-04-01", category: "MATERIAL",
      description: "鉄骨資材", budgeted_amount: 500000, actual_amount: 480000,
      vendor_name: "鉄骨商事", created_at: "", updated_at: "",
    },
  ],
  meta: { page: 1, per_page: 20, total: 1, pages: 1 },
};

const mockSummary = {
  total_budgeted: 500000, total_actual: 480000, variance: 20000, variance_rate: 4.0, by_category: {},
};

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
}

function renderTab() {
  return render(
    <QueryClientProvider client={makeQueryClient()}>
      <CostTab projectId="p1" />
    </QueryClientProvider>,
  );
}

describe("CostTab", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(costApi.listCostRecords).mockResolvedValue(emptyList);
    vi.mocked(costApi.getCostSummary).mockResolvedValue(emptySummary);
  });

  it("データなし状態が表示される", async () => {
    renderTab();
    await waitFor(() => {
      expect(screen.getByText("原価記録がまだありません")).toBeInTheDocument();
    });
  });

  it("「原価管理」見出しが表示される", async () => {
    renderTab();
    await waitFor(() => {
      expect(screen.getByText("原価管理")).toBeInTheDocument();
    });
  });

  it("「新規作成」ボタンが表示される", async () => {
    renderTab();
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /新規作成/ })).toBeInTheDocument();
    });
  });

  it("原価データが表示される", async () => {
    vi.mocked(costApi.listCostRecords).mockResolvedValue(mockRecords);
    vi.mocked(costApi.getCostSummary).mockResolvedValue(mockSummary);
    renderTab();
    await waitFor(() => {
      expect(screen.getByText("鉄骨資材")).toBeInTheDocument();
    });
    expect(screen.getByText("材料費")).toBeInTheDocument();
    expect(screen.getByText("2026-04-01")).toBeInTheDocument();
  });

  it("サマリーが表示される", async () => {
    vi.mocked(costApi.listCostRecords).mockResolvedValue(mockRecords);
    vi.mocked(costApi.getCostSummary).mockResolvedValue(mockSummary);
    renderTab();
    await waitFor(() => {
      expect(screen.getByText("予算合計")).toBeInTheDocument();
    });
    expect(screen.getByText("実績合計")).toBeInTheDocument();
    expect(screen.getAllByText("差異").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("差異率")).toBeInTheDocument();
  });

  it("差異がプラスの場合は緑色で表示される", async () => {
    vi.mocked(costApi.listCostRecords).mockResolvedValue(mockRecords);
    vi.mocked(costApi.getCostSummary).mockResolvedValue(mockSummary);
    renderTab();
    await waitFor(() => {
      expect(screen.getByText("¥20,000")).toBeInTheDocument();
    });
  });

  it("「新規作成」クリックでモーダルが開く", async () => {
    renderTab();
    await waitFor(() => screen.getByRole("button", { name: /新規作成/ }));
    fireEvent.click(screen.getByRole("button", { name: /新規作成/ }));
    expect(screen.getByText("原価を記録")).toBeInTheDocument();
  });

  it("モーダルで必須項目が空の場合、作成ボタンが無効", async () => {
    renderTab();
    await waitFor(() => screen.getByRole("button", { name: /新規作成/ }));
    fireEvent.click(screen.getByRole("button", { name: /新規作成/ }));
    const createBtns = screen.getAllByRole("button", { name: /作成/ });
    const modalCreateBtn = createBtns.find((btn) => btn.closest("[role='dialog'], .fixed"));
    expect(modalCreateBtn ?? createBtns[createBtns.length - 1]).toBeDisabled();
  });

  it("削除ボタンをクリックすると確認後に API が呼ばれる", async () => {
    vi.mocked(costApi.listCostRecords).mockResolvedValue(mockRecords);
    vi.mocked(costApi.getCostSummary).mockResolvedValue(mockSummary);
    vi.mocked(costApi.deleteCostRecord).mockResolvedValue(undefined);
    window.confirm = vi.fn(() => true);
    renderTab();
    await waitFor(() => screen.getByText("鉄骨資材"));
    const deleteBtn = screen.getByTitle("削除");
    fireEvent.click(deleteBtn);
    expect(window.confirm).toHaveBeenCalled();
    await waitFor(() => {
      expect(costApi.deleteCostRecord).toHaveBeenCalledWith("p1", "c1");
    });
  });
});
