import api from "./client";
import type { PaginatedResponse } from "./projects";
import type {
  DailyReportResponse,
  DailyReportCreate,
} from "@/generated";

// Re-export with backward-compatible aliases
export type DailyReport = DailyReportResponse;
export type { DailyReportCreate };

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

  get: async (_projectId: string, reportId: string) => {
    const res = await api.get<{ data: DailyReport }>(
      `/daily-reports/${reportId}`
    );
    return res.data.data;
  },

  update: async (
    _projectId: string,
    reportId: string,
    data: Partial<DailyReportCreate>
  ) => {
    const res = await api.put<{ data: DailyReport }>(
      `/daily-reports/${reportId}`,
      data
    );
    return res.data.data;
  },

  delete: async (_projectId: string, reportId: string) => {
    await api.delete(`/daily-reports/${reportId}`);
  },
};
