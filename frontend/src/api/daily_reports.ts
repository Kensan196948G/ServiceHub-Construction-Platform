import api from "./client";
import { PaginatedResponse } from "./projects";

export interface DailyReportCreate {
  project_id: string;
  report_date: string;
  weather?: string;
  temperature?: number;
  worker_count?: number;
  work_content?: string;
  safety_check?: boolean;
  safety_notes?: string;
  progress_rate?: number;
  issues?: string;
}

export interface DailyReport {
  id: string;
  project_id: string;
  report_date: string;
  weather: string | null;
  temperature: number | null;
  worker_count: number;
  work_content: string | null;
  safety_check: boolean;
  safety_notes: string | null;
  progress_rate: number | null;
  issues: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export const dailyReportsApi = {
  list: async (projectId: string, page = 1, perPage = 20) => {
    const res = await api.get<PaginatedResponse<DailyReport>>(
      `/projects/${projectId}/daily-reports`,
      { params: { page, per_page: perPage } }
    );
    return res.data;
  },

  create: async (projectId: string, data: DailyReportCreate) => {
    const res = await api.post<{ data: DailyReport }>(
      `/projects/${projectId}/daily-reports`,
      data
    );
    return res.data.data;
  },

  get: async (projectId: string, reportId: string) => {
    const res = await api.get<{ data: DailyReport }>(
      `/projects/${projectId}/daily-reports/${reportId}`
    );
    return res.data.data;
  },

  update: async (
    projectId: string,
    reportId: string,
    data: Partial<DailyReportCreate>
  ) => {
    const res = await api.put<{ data: DailyReport }>(
      `/projects/${projectId}/daily-reports/${reportId}`,
      data
    );
    return res.data.data;
  },

  delete: async (projectId: string, reportId: string) => {
    await api.delete(`/projects/${projectId}/daily-reports/${reportId}`);
  },
};
