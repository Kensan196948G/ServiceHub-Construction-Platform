import api from "./client";
import type { PaginatedResponse } from "./projects";
import type {
  UserListResponse,
  UserCreate,
  UserUpdate,
} from "@/generated";

// Re-export with backward-compatible aliases
export type User = UserListResponse;
export type { UserCreate, UserUpdate };

export const usersApi = {
  list: (page = 1, perPage = 20) =>
    api.get<PaginatedResponse<User>>("/users", { params: { page, per_page: perPage } }).then((r) => r.data),
  create: (data: UserCreate) => api.post<{ data: User }>("/users", data).then((r) => r.data.data),
  get: (id: string) => api.get<{ data: User }>(`/users/${id}`).then((r) => r.data.data),
  update: (id: string, data: UserUpdate) =>
    api.put<{ data: User }>(`/users/${id}`, data).then((r) => r.data.data),
  deleteUser: async (id: string) => {
    await api.delete(`/users/${id}`);
  },
};
