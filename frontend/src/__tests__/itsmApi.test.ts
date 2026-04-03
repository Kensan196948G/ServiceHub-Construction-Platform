import { describe, it, expect, vi, beforeEach } from "vitest";
import api from "@/api/client";
import { itsmApi } from "@/api/itsm";

vi.mock("@/api/client", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

describe("itsmApi", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("createIncident は POST /itsm/incidents を呼ぶ", async () => {
    const payload = {
      title: "サーバー障害",
      description: "本番環境のAPIが応答なし",
      priority: "HIGH",
      severity: "CRITICAL",
    };
    vi.mocked(api.post).mockResolvedValue({
      data: { data: { id: "inc-1", incident_number: "INC-000001", ...payload } },
    });

    const result = await itsmApi.createIncident(payload);

    expect(api.post).toHaveBeenCalledWith("/itsm/incidents", payload);
    expect(result.incident_number).toBe("INC-000001");
  });

  it("listIncidents はページネーション付きで GET を呼ぶ", async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: {
        data: [{ id: "inc-1", title: "Test" }],
        meta: { page: 1, per_page: 20, total: 1 },
      },
    });

    const result = await itsmApi.listIncidents(1, 20);

    expect(api.get).toHaveBeenCalledWith("/itsm/incidents", {
      params: { page: 1, per_page: 20 },
    });
    expect(result.data).toHaveLength(1);
  });

  it("getIncident は GET /itsm/incidents/:id を呼ぶ", async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: { data: { id: "inc-1", status: "OPEN" } },
    });

    const result = await itsmApi.getIncident("inc-1");

    expect(api.get).toHaveBeenCalledWith("/itsm/incidents/inc-1");
    expect(result.status).toBe("OPEN");
  });

  it("createChangeRequest は POST /itsm/changes を呼ぶ", async () => {
    const payload = {
      title: "DB マイグレーション",
      description: "新テーブル追加",
      change_type: "NORMAL",
      risk_level: "LOW",
    };
    vi.mocked(api.post).mockResolvedValue({
      data: { data: { id: "chg-1", change_number: "CHG-000001", ...payload } },
    });

    const result = await itsmApi.createChangeRequest(payload);

    expect(api.post).toHaveBeenCalledWith("/itsm/changes", payload);
    expect(result.change_number).toBe("CHG-000001");
  });

  it("listChangeRequests はページネーション付きで GET を呼ぶ", async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: {
        data: [{ id: "chg-1" }],
        meta: { page: 1, per_page: 20, total: 1 },
      },
    });

    const result = await itsmApi.listChangeRequests(2, 10);

    expect(api.get).toHaveBeenCalledWith("/itsm/changes", {
      params: { page: 2, per_page: 10 },
    });
    expect(result.data).toHaveLength(1);
  });
});
