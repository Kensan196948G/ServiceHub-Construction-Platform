import { describe, it, expect, vi, beforeEach } from "vitest";
import api from "@/api/client";
import { dailyReportsApi } from "@/api/daily_reports";

vi.mock("@/api/client", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

describe("dailyReportsApi", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("list は GET /projects/:id/daily-reports を呼ぶ", async () => {
    const mockData = {
      success: true,
      data: [{ id: "r1", project_id: "p1", report_date: "2026-04-04" }],
      meta: { page: 1, per_page: 20, total: 1, pages: 1 },
    };
    vi.mocked(api.get).mockResolvedValue({ data: mockData });

    const result = await dailyReportsApi.list("p1");

    expect(api.get).toHaveBeenCalledWith("/projects/p1/daily-reports", {
      params: { page: 1, per_page: 20 },
    });
    expect(result.data).toHaveLength(1);
  });

  it("create は POST /projects/:id/daily-reports を呼ぶ", async () => {
    const payload = {
      project_id: "p1",
      report_date: "2026-04-04",
      work_content: "基礎工事",
    };
    const mockReport = { id: "r1", ...payload, status: "DRAFT" };
    vi.mocked(api.post).mockResolvedValue({ data: { data: mockReport } });

    const result = await dailyReportsApi.create("p1", payload);

    expect(api.post).toHaveBeenCalledWith(
      "/projects/p1/daily-reports",
      payload,
    );
    expect(result.id).toBe("r1");
  });

  it("get は GET /projects/:id/daily-reports/:reportId を呼ぶ", async () => {
    const mockReport = { id: "r1", project_id: "p1", status: "SUBMITTED" };
    vi.mocked(api.get).mockResolvedValue({ data: { data: mockReport } });

    const result = await dailyReportsApi.get("p1", "r1");

    expect(api.get).toHaveBeenCalledWith("/projects/p1/daily-reports/r1");
    expect(result.id).toBe("r1");
  });

  it("update は PUT /projects/:id/daily-reports/:reportId を呼ぶ", async () => {
    const patch = { work_content: "更新内容" };
    const mockReport = { id: "r1", project_id: "p1", ...patch };
    vi.mocked(api.put).mockResolvedValue({ data: { data: mockReport } });

    const result = await dailyReportsApi.update("p1", "r1", patch);

    expect(api.put).toHaveBeenCalledWith(
      "/projects/p1/daily-reports/r1",
      patch,
    );
    expect(result.work_content).toBe("更新内容");
  });

  it("delete は DELETE /projects/:id/daily-reports/:reportId を呼ぶ", async () => {
    vi.mocked(api.delete).mockResolvedValue({});

    await dailyReportsApi.delete("p1", "r1");

    expect(api.delete).toHaveBeenCalledWith("/projects/p1/daily-reports/r1");
  });
});
