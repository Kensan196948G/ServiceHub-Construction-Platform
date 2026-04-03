import { describe, it, expect, vi, beforeEach } from "vitest";
import api from "@/api/client";
import { usersApi } from "@/api/users";

vi.mock("@/api/client", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

describe("usersApi", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("list はページネーション付きで GET /users を呼ぶ", async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: {
        data: [{ id: "u1", email: "test@test.com" }],
        meta: { page: 1, per_page: 20, total: 1 },
      },
    });

    const result = await usersApi.list(1, 20);

    expect(api.get).toHaveBeenCalledWith("/users", {
      params: { page: 1, per_page: 20 },
    });
    expect(result.data).toHaveLength(1);
  });

  it("create は POST /users を呼ぶ", async () => {
    const payload = {
      email: "new@test.com",
      full_name: "New User",
      password: "Pass123!",
      role: "VIEWER",
    };
    vi.mocked(api.post).mockResolvedValue({
      data: { data: { id: "u2", ...payload } },
    });

    const result = await usersApi.create(payload);

    expect(api.post).toHaveBeenCalledWith("/users", payload);
    expect(result.email).toBe("new@test.com");
  });

  it("get は GET /users/:id を呼ぶ", async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: { data: { id: "u1", full_name: "Admin" } },
    });

    const result = await usersApi.get("u1");

    expect(api.get).toHaveBeenCalledWith("/users/u1");
    expect(result.full_name).toBe("Admin");
  });

  it("deleteUser は DELETE /users/:id を呼ぶ", async () => {
    vi.mocked(api.delete).mockResolvedValue({});

    await usersApi.deleteUser("u1");

    expect(api.delete).toHaveBeenCalledWith("/users/u1");
  });
});
