import api from "./client";
import type { PaginatedResponse } from "./projects";
import type {
  SafetyCheckResponse,
  SafetyCheckCreate,
  QualityInspectionResponse,
  QualityInspectionCreate,
} from "@/generated";

// Re-export with backward-compatible aliases
export type SafetyCheck = SafetyCheckResponse;
export type QualityInspection = QualityInspectionResponse;
export type { SafetyCheckCreate, QualityInspectionCreate };

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

  deleteSafetyCheck: async (projectId: string, checkId: string) => {
    await api.delete(`/projects/${projectId}/safety-checks/${checkId}`);
  },

  deleteQualityInspection: async (projectId: string, inspectionId: string) => {
    await api.delete(`/projects/${projectId}/quality-inspections/${inspectionId}`);
  },
};
