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

interface UserListData {
  data: User[];
  meta: { page: number; per_page: number; total: number; pages: number };
}

export const usersApi = {
  list: (page = 1, perPage = 20) =>
    api.get<UserListData>("/users", { params: { page, per_page: perPage } }).then((r) => r.data),
  create: (data: UserCreate) =>
    api.post<{ data: User }>("/users", data).then((r) => r.data.data),
  get: (id: string) =>
    api.get<{ data: User }>(`/users/${id}`).then((r) => r.data.data),
  update: (id: string, data: UserUpdate) =>
    api.put<{ data: User }>(`/users/${id}`, data).then((r) => r.data.data),
  deleteUser: async (id: string) => {
    await api.delete(`/users/${id}`);
  },
};
