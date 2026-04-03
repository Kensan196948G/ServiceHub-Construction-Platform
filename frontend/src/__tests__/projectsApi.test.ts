import { describe, it, expect, vi, beforeEach } from "vitest";
import api from "@/api/client";
import { projectsApi } from "@/api/projects";

vi.mock("@/api/client", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

describe("projectsApi", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("list はページネーション付きで GET /projects を呼ぶ", async () => {
    const mockResponse = {
      data: {
        success: true,
        data: [{ id: "1", name: "Test Project" }],
        meta: { page: 1, per_page: 20, total: 1 },
      },
    };
    vi.mocked(api.get).mockResolvedValue(mockResponse);

    const result = await projectsApi.list(1, 20);

    expect(api.get).toHaveBeenCalledWith("/projects", {
      params: { page: 1, per_page: 20 },
    });
    expect(result.data).toHaveLength(1);
    expect(result.data[0].name).toBe("Test Project");
  });

  it("get は GET /projects/:id を呼ぶ", async () => {
    const mockProject = { id: "uuid-1", name: "My Project" };
    vi.mocked(api.get).mockResolvedValue({
      data: { data: mockProject },
    });

    const result = await projectsApi.get("uuid-1");

    expect(api.get).toHaveBeenCalledWith("/projects/uuid-1");
    expect(result.id).toBe("uuid-1");
  });

  it("create は POST /projects を呼ぶ", async () => {
    const payload = {
      project_code: "PRJ-001",
      name: "New Project",
      client_name: "Client A",
      status: "PLANNING",
    };
    vi.mocked(api.post).mockResolvedValue({
      data: { data: { id: "new-id", ...payload } },
    });

    const result = await projectsApi.create(payload);

    expect(api.post).toHaveBeenCalledWith("/projects", payload);
    expect(result.project_code).toBe("PRJ-001");
  });

  it("update は PUT /projects/:id を呼ぶ", async () => {
    const payload = { name: "Updated Name" };
    vi.mocked(api.put).mockResolvedValue({
      data: { data: { id: "uuid-1", name: "Updated Name" } },
    });

    const result = await projectsApi.update("uuid-1", payload);

    expect(api.put).toHaveBeenCalledWith("/projects/uuid-1", payload);
    expect(result.name).toBe("Updated Name");
  });

  it("delete は DELETE /projects/:id を呼ぶ", async () => {
    vi.mocked(api.delete).mockResolvedValue({});

    await projectsApi.delete("uuid-1");

    expect(api.delete).toHaveBeenCalledWith("/projects/uuid-1");
  });
});
