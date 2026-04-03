import api from "./client";

export interface LoginRequest {
  username: string;
  password: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
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
    const form = new FormData();
    form.append("username", data.username);
    form.append("password", data.password);
    const res = await api.post<TokenResponse>("/auth/login", form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data;
  },
  me: async (): Promise<UserResponse> => {
    const res = await api.get<{ data: UserResponse }>("/auth/me");
    return res.data.data;
  },
};
