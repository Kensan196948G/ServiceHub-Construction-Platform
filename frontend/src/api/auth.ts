import api from "./client";
import { useAuthStore } from "@/stores/authStore";
import type {
  LoginRequest,
  TokenResponse,
  UserResponse,
} from "@/generated";

// Re-export generated types for downstream consumers
export type { LoginRequest, TokenResponse, UserResponse };

const BASE_URL = "/api/v1";

export const authApi = {
  login: async (data: LoginRequest): Promise<TokenResponse> => {
    const res = await api.post<TokenResponse>("/auth/login", {
      email: data.email,
      password: data.password,
    });
    return res.data;
  },
  me: async (): Promise<UserResponse> => {
    const res = await api.get<{ data: UserResponse }>("/auth/me");
    return res.data.data;
  },
  /** Refresh tokens using the stored refresh_token. Bypasses the API client to avoid infinite 401 loops. */
  refresh: async (refreshToken: string): Promise<TokenResponse> => {
    const res = await fetch(`${BASE_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    if (!res.ok) {
      throw new Error(`Refresh failed: ${res.status}`);
    }
    return res.json();
  },
  /** Logout: notify server (best-effort), then clear client state. */
  logout: async (): Promise<void> => {
    const token = useAuthStore.getState().token;
    try {
      await fetch(`${BASE_URL}/auth/logout`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
    } catch {
      // Server logout is best-effort; client cleanup always proceeds
    }
    useAuthStore.getState().logout();
  },
};
