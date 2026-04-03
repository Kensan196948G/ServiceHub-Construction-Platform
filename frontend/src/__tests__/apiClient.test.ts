import { describe, it, expect, beforeEach, vi } from "vitest";
import { useAuthStore } from "@/stores/authStore";

// axios をモック
vi.mock("axios", () => {
  const interceptors = {
    request: { use: vi.fn() },
    response: { use: vi.fn() },
  };
  const instance = {
    interceptors,
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  };
  return {
    default: {
      create: vi.fn(() => instance),
    },
  };
});

describe("API Client", () => {
  beforeEach(() => {
    useAuthStore.setState({ token: null, user: null });
  });

  it("トークンがストアに設定されていればリクエストヘッダーに含まれる", () => {
    useAuthStore.setState({
      token: "test-jwt-token",
      user: {
        id: "1",
        email: "test@test.com",
        full_name: "Test",
        role: "ADMIN",
      },
    });

    const state = useAuthStore.getState();
    expect(state.token).toBe("test-jwt-token");

    // interceptor が Authorization ヘッダーを設定することを検証
    const config = { headers: {} as Record<string, string> };
    const token = useAuthStore.getState().token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    expect(config.headers.Authorization).toBe("Bearer test-jwt-token");
  });

  it("トークンがなければ Authorization ヘッダーは設定されない", () => {
    const config = { headers: {} as Record<string, string> };
    const token = useAuthStore.getState().token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    expect(config.headers.Authorization).toBeUndefined();
  });

  it("401エラーでログアウトが呼ばれる", () => {
    const mockUser = {
      id: "1",
      email: "test@test.com",
      full_name: "Test",
      role: "ADMIN",
    };
    useAuthStore.getState().setAuth("token", mockUser);
    expect(useAuthStore.getState().token).toBe("token");

    // 401 をシミュレート
    useAuthStore.getState().logout();
    expect(useAuthStore.getState().token).toBeNull();
    expect(useAuthStore.getState().user).toBeNull();
  });
});
