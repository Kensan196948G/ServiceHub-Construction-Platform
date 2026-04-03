import { describe, it, expect, vi, beforeEach } from "vitest";
import api from "@/api/client";
import { safetyApi } from "@/api/safety";

vi.mock("@/api/client", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

describe("safetyApi", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("createSafetyCheck は POST を呼ぶ", async () => {
    const payload = {
      project_id: "proj-1",
      check_date: "2026-04-03",
      check_type: "日次",
      items_total: 10,
      items_ok: 9,
      items_ng: 1,
    };
    vi.mocked(api.post).mockResolvedValue({
      data: { data: { id: "check-1", ...payload } },
    });

    const result = await safetyApi.createSafetyCheck("proj-1", payload);

    expect(api.post).toHaveBeenCalledWith(
      "/projects/proj-1/safety-checks",
      payload
    );
    expect(result.items_total).toBe(10);
  });

  it("listSafetyChecks はページネーション付きで GET を呼ぶ", async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: {
        data: [{ id: "c1" }],
        meta: { page: 1, per_page: 20, total: 1 },
      },
    });

    const result = await safetyApi.listSafetyChecks("proj-1", 1, 20);

    expect(api.get).toHaveBeenCalledWith(
      "/projects/proj-1/safety-checks",
      { params: { page: 1, per_page: 20 } }
    );
    expect(result.data).toHaveLength(1);
  });

  it("deleteSafetyCheck は DELETE を呼ぶ", async () => {
    vi.mocked(api.delete).mockResolvedValue({});

    await safetyApi.deleteSafetyCheck("proj-1", "check-1");

    expect(api.delete).toHaveBeenCalledWith(
      "/projects/proj-1/safety-checks/check-1"
    );
  });

  it("createQualityInspection は POST を呼ぶ", async () => {
    const payload = {
      project_id: "proj-1",
      inspection_date: "2026-04-03",
      inspection_type: "出来形",
      target_item: "基礎コンクリート",
      result: "PASS",
    };
    vi.mocked(api.post).mockResolvedValue({
      data: { data: { id: "insp-1", ...payload } },
    });

    const result = await safetyApi.createQualityInspection("proj-1", payload);

    expect(api.post).toHaveBeenCalledWith(
      "/projects/proj-1/quality-inspections",
      payload
    );
    expect(result.result).toBe("PASS");
  });
});
