import { describe, it, expect, vi, beforeEach } from "vitest";
import api from "@/api/client";
import { authApi } from "@/api/auth";

vi.mock("@/api/client", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

describe("authApi", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("login は POST /auth/login を呼びトークンを返す", async () => {
    const tokenResponse = {
      access_token: "jwt-token-123",
      refresh_token: "refresh-456",
      token_type: "bearer",
      expires_in: 3600,
    };
    vi.mocked(api.post).mockResolvedValue({ data: tokenResponse });

    const result = await authApi.login({
      email: "admin@test.com",
      password: "password123",
    });

    expect(api.post).toHaveBeenCalledWith("/auth/login", {
      email: "admin@test.com",
      password: "password123",
    });
    expect(result.access_token).toBe("jwt-token-123");
    expect(result.token_type).toBe("bearer");
  });

  it("me は GET /auth/me を呼びユーザー情報を返す", async () => {
    const userResponse = {
      id: "user-1",
      email: "admin@test.com",
      full_name: "Admin User",
      role: "ADMIN",
      is_active: true,
    };
    vi.mocked(api.get).mockResolvedValue({
      data: { data: userResponse },
    });

    const result = await authApi.me();

    expect(api.get).toHaveBeenCalledWith("/auth/me");
    expect(result.role).toBe("ADMIN");
    expect(result.email).toBe("admin@test.com");
  });
});
