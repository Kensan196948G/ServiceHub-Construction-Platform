import api from "./client";
import type { PaginatedResponse } from "./projects";
import type {
  CostRecordResponse,
  CostRecordCreate,
  CostSummary,
  WorkHourResponse,
  WorkHourCreate,
} from "@/generated";

// Re-export with backward-compatible aliases
export type CostRecord = CostRecordResponse;
export type WorkHour = WorkHourResponse;
export type { CostRecordCreate, CostSummary, WorkHourCreate };

export const costApi = {
  createCostRecord: async (projectId: string, data: CostRecordCreate) => {
    const res = await api.post<{ data: CostRecord }>(
      `/projects/${projectId}/cost-records`,
      data
    );
    return res.data.data;
  },

  listCostRecords: async (projectId: string, page = 1, perPage = 20) => {
    const res = await api.get<PaginatedResponse<CostRecord>>(
      `/projects/${projectId}/cost-records`,
      { params: { page, per_page: perPage } }
    );
    return res.data;
  },

  getCostSummary: async (projectId: string) => {
    const res = await api.get<{ data: CostSummary }>(
      `/projects/${projectId}/cost-summary`
    );
    return res.data.data;
  },

  createWorkHour: async (projectId: string, data: WorkHourCreate) => {
    const res = await api.post<{ data: WorkHour }>(
      `/projects/${projectId}/work-hours`,
      data
    );
    return res.data.data;
  },

  deleteCostRecord: async (projectId: string, recordId: string) => {
    await api.delete(`/projects/${projectId}/cost-records/${recordId}`);
  },
};
