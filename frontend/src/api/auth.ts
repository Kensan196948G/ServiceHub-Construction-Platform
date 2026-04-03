import api from "./client";

export interface LoginRequest {
  email: string;
  password: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

export interface UserResponse {
  id: string;
  email: string;
  full_name: string;
  role: string;
  is_active: boolean;
}

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
