import api from "./client";

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: string;
  is_active: boolean;
  last_login_at: string | null;
  created_at: string;
}

export interface UserCreate {
  email: string;
  full_name: string;
  password: string;
  role: string;
}

export interface UserUpdate {
  full_name?: string;
  role?: string;
  is_active?: boolean;
}

export const usersApi = {
  list: (page = 1, perPage = 20) =>
    api.get("/users", { params: { page, per_page: perPage } }).then((r) => r.data),
  create: (data: UserCreate) => api.post("/users", data).then((r) => r.data.data),
  get: (id: string) => api.get(`/users/${id}`).then((r) => r.data.data),
  update: (id: string, data: UserUpdate) =>
    api.put(`/users/${id}`, data).then((r) => r.data.data),
};
