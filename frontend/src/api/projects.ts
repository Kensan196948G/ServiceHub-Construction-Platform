import api from "./client";

export interface Project {
  id: string;
  project_code: string;
  name: string;
  description: string | null;
  client_name: string;
  site_address: string | null;
  status: string;
  budget: number | null;
  start_date: string | null;
  end_date: string | null;
  manager_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectCreate {
  project_code: string;
  name: string;
  description?: string;
  client_name: string;
  site_address?: string;
  status: string;
  budget?: number;
  start_date?: string;
  end_date?: string;
  manager_id?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  meta: {
    page: number;
    per_page: number;
    total: number;
    total_pages?: number;
    pages?: number;
  };
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
