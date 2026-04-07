import { describe, it, expect, vi, beforeEach } from "vitest";
import api from "@/api/client";
import { costApi } from "@/api/cost";

vi.mock("@/api/client", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

describe("costApi", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("createCostRecord は POST を呼ぶ", async () => {
    const payload = {
      project_id: "proj-1",
      record_date: "2026-04-01",
      category: "材料費",
      description: "鉄骨",
      budgeted_amount: 1000000,
      actual_amount: 950000,
    };
    vi.mocked(api.post).mockResolvedValue({
      data: { data: { id: "cr-1", ...payload } },
    });

    const result = await costApi.createCostRecord("proj-1", payload);

    expect(api.post).toHaveBeenCalledWith("/projects/proj-1/cost-records", payload);
    expect(result.category).toBe("材料費");
  });

  it("listCostRecords はページネーション付きで GET を呼ぶ", async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: {
        data: [{ id: "cr-1" }],
        meta: { page: 1, per_page: 20, total: 1 },
      },
    });

    const result = await costApi.listCostRecords("proj-1");

    expect(api.get).toHaveBeenCalledWith("/projects/proj-1/cost-records", {
      params: { page: 1, per_page: 20 },
    });
    expect(result.data).toHaveLength(1);
  });

  it("getCostSummary は GET を呼ぶ", async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: {
        data: {
          total_budgeted: 1000000,
          total_actual: 950000,
          variance: 50000,
          variance_rate: 5.0,
        },
      },
    });

    const result = await costApi.getCostSummary("proj-1");

    expect(api.get).toHaveBeenCalledWith("/projects/proj-1/cost-summary");
    expect(result.variance_rate).toBe(5.0);
  });

  it("createWorkHour は POST を呼ぶ", async () => {
    const payload = {
      project_id: "proj-1",
      work_date: "2026-04-01",
      hours: 8,
      work_type: "REGULAR",
    };
    vi.mocked(api.post).mockResolvedValue({
      data: { data: { id: "wh-1", ...payload } },
    });

    const result = await costApi.createWorkHour("proj-1", payload);

    expect(api.post).toHaveBeenCalledWith(
      "/projects/proj-1/work-hours",
      payload
    );
    expect(result.hours).toBe(8);
  });

  it("deleteCostRecord は DELETE を呼ぶ", async () => {
    vi.mocked(api.delete).mockResolvedValue({});

    await costApi.deleteCostRecord("proj-1", "cr-1");

    expect(api.delete).toHaveBeenCalledWith("/projects/proj-1/cost-records/cr-1");
  });
});
