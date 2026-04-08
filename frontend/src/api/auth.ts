import api from "./client";
import type {
  LoginRequest,
  TokenResponse,
  UserResponse,
} from "@/generated";

// Re-export generated types for downstream consumers
export type { LoginRequest, TokenResponse, UserResponse };

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
};
