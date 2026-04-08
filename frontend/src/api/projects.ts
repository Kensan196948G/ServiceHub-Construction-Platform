import api from "./client";
import type {
  ProjectResponse,
  ProjectCreate,
  PaginationMeta,
} from "@/generated";

// Re-export with backward-compatible aliases
export type Project = ProjectResponse;
export type { ProjectCreate };

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  meta: PaginationMeta;
}

export const projectsApi = {
  list: async (page = 1, perPage = 20) => {
    const res = await api.get<PaginatedResponse<Project>>("/projects", {
      params: { page, per_page: perPage },
    });
    return res.data;
  },
  get: async (id: string) => {
    const res = await api.get<{ data: Project }>(`/projects/${id}`);
    return res.data.data;
  },
  create: async (data: ProjectCreate) => {
    const res = await api.post<{ data: Project }>("/projects", data);
    return res.data.data;
  },
  update: async (id: string, data: Partial<ProjectCreate>) => {
    const res = await api.put<{ data: Project }>(`/projects/${id}`, data);
    return res.data.data;
  },
  delete: async (id: string) => {
    await api.delete(`/projects/${id}`);
  },
};
