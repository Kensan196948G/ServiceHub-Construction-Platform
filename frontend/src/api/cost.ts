import api from "./client";
import { PaginatedResponse } from "./projects";

export interface CostRecordCreate {
  project_id: string;
  record_date: string;
  category: string;
  description: string;
  budgeted_amount?: number;
  actual_amount?: number;
  vendor_name?: string;
  invoice_number?: string;
  notes?: string;
}

export interface CostRecord {
  id: string;
  project_id: string;
  record_date: string;
  category: string;
  description: string;
  budgeted_amount: number;
  actual_amount: number;
  vendor_name: string | null;
  invoice_number: string | null;
  notes: string | null;
  created_at: string;
}

export interface CostSummary {
  project_id: string;
  total_budgeted: number;
  total_actual: number;
  variance: number;
  variance_rate: number;
  by_category: Record<string, unknown>;
}

export interface WorkHourCreate {
  project_id: string;
  work_date: string;
  hours: number;
  work_type?: string;
  description?: string;
  worker_id?: string;
}

export interface WorkHour {
  id: string;
  project_id: string;
  work_date: string;
  hours: number;
  work_type: string | null;
  description: string | null;
  worker_id: string | null;
  created_at: string;
}

export const costApi = {
  createCostRecord: async (projectId: string, data: CostRecordCreate) => {
    const res = await api.post<{ data: CostRecord }>(
      `/projects/${projectId}/costs`,
      data
    );
    return res.data.data;
  },

  listCostRecords: async (projectId: string, page = 1, perPage = 20) => {
    const res = await api.get<PaginatedResponse<CostRecord>>(
      `/projects/${projectId}/costs`,
      { params: { page, per_page: perPage } }
    );
    return res.data;
  },

  getCostSummary: async (projectId: string) => {
    const res = await api.get<{ data: CostSummary }>(
      `/projects/${projectId}/costs/summary`
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
};
