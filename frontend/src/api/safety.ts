import api from "./client";
import { PaginatedResponse } from "./projects";

export interface SafetyCheckCreate {
  project_id: string;
  check_date: string;
  check_type?: string;
  items_total?: number;
  items_ok?: number;
  items_ng?: number;
  overall_result?: string;
  notes?: string;
}

export interface SafetyCheck {
  id: string;
  project_id: string;
  check_date: string;
  check_type: string;
  items_total: number;
  items_ok: number;
  items_ng: number;
  overall_result: string;
  notes: string | null;
  created_at: string;
}

export interface QualityInspectionCreate {
  project_id: string;
  inspection_date: string;
  inspection_type: string;
  target_item: string;
  standard_value?: string;
  measured_value?: string;
  result?: string;
  remarks?: string;
}

export interface QualityInspection {
  id: string;
  project_id: string;
  inspection_date: string;
  inspection_type: string;
  target_item: string;
  standard_value: string | null;
  measured_value: string | null;
  result: string;
  remarks: string | null;
  created_at: string;
}

export const safetyApi = {
  createSafetyCheck: async (projectId: string, data: SafetyCheckCreate) => {
    const res = await api.post<{ data: SafetyCheck }>(
      `/projects/${projectId}/safety-checks`,
      data
    );
    return res.data.data;
  },

  listSafetyChecks: async (projectId: string, page = 1, perPage = 20) => {
    const res = await api.get<PaginatedResponse<SafetyCheck>>(
      `/projects/${projectId}/safety-checks`,
      { params: { page, per_page: perPage } }
    );
    return res.data;
  },

  createQualityInspection: async (
    projectId: string,
    data: QualityInspectionCreate
  ) => {
    const res = await api.post<{ data: QualityInspection }>(
      `/projects/${projectId}/quality-inspections`,
      data
    );
    return res.data.data;
  },

  listQualityInspections: async (
    projectId: string,
    page = 1,
    perPage = 20
  ) => {
    const res = await api.get<PaginatedResponse<QualityInspection>>(
      `/projects/${projectId}/quality-inspections`,
      { params: { page, per_page: perPage } }
    );
    return res.data;
  },
};
