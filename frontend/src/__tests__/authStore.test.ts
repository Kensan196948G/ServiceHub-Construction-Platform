import { describe, it, expect, beforeEach } from "vitest";
import { useAuthStore } from "@/stores/authStore";

describe("useAuthStore", () => {
  beforeEach(() => {
    // ストアをリセット
    useAuthStore.setState({ token: null, user: null });
  });

  it("初期状態は token と user が null", () => {
    const state = useAuthStore.getState();
    expect(state.token).toBeNull();
    expect(state.user).toBeNull();
  });

  it("setAuth でトークンとユーザーを設定できる", () => {
    const mockUser = {
      id: "test-uuid",
      email: "test@example.com",
      full_name: "テストユーザー",
      role: "ADMIN",
    };

    useAuthStore.getState().setAuth("test-token-123", mockUser);

    const state = useAuthStore.getState();
    expect(state.token).toBe("test-token-123");
    expect(state.user).toEqual(mockUser);
    expect(state.user?.email).toBe("test@example.com");
  });

  it("logout でトークンとユーザーがクリアされる", () => {
    const mockUser = {
      id: "test-uuid",
      email: "test@example.com",
      full_name: "テストユーザー",
      role: "VIEWER",
    };

    useAuthStore.getState().setAuth("token", mockUser);
    expect(useAuthStore.getState().token).toBe("token");

    useAuthStore.getState().logout();

    const state = useAuthStore.getState();
    expect(state.token).toBeNull();
    expect(state.user).toBeNull();
  });

  it("setAuth を複数回呼ぶと最後の値が反映される", () => {
    const user1 = {
      id: "1",
      email: "a@test.com",
      full_name: "User A",
      role: "ADMIN",
    };
    const user2 = {
      id: "2",
      email: "b@test.com",
      full_name: "User B",
      role: "VIEWER",
    };

    useAuthStore.getState().setAuth("token-1", user1);
    useAuthStore.getState().setAuth("token-2", user2);

    const state = useAuthStore.getState();
    expect(state.token).toBe("token-2");
    expect(state.user?.id).toBe("2");
  });
});
