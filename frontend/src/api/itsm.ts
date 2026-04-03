import api from "./client";
import { PaginatedResponse } from "./projects";

export interface IncidentCreate {
  title: string;
  description: string;
  category?: string;
  priority?: string;
  severity?: string;
  assigned_to?: string;
  project_id?: string;
}

export interface Incident {
  id: string;
  incident_number: string;
  title: string;
  description: string;
  category: string;
  priority: string;
  severity: string;
  status: string;
  assigned_to: string | null;
  project_id: string | null;
  resolution: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface IncidentUpdate extends Partial<IncidentCreate> {
  status?: string;
  resolution?: string;
}

export interface ChangeRequestCreate {
  title: string;
  description: string;
  change_type?: string;
  risk_level?: string;
  impact?: string;
  rollback_plan?: string;
  scheduled_start?: string;
  scheduled_end?: string;
}

export interface ChangeRequestUpdate extends Partial<ChangeRequestCreate> {
  status?: string;
}

export interface ChangeRequest {
  id: string;
  change_number: string;
  title: string;
  description: string;
  change_type: string;
  risk_level: string;
  status: string;
  impact: string | null;
  rollback_plan: string | null;
  scheduled_start: string | null;
  scheduled_end: string | null;
  approved_by: string | null;
  created_at: string;
  updated_at: string;
}

export const itsmApi = {
  createIncident: async (data: IncidentCreate) => {
    const res = await api.post<{ data: Incident }>("/itsm/incidents", data);
    return res.data.data;
  },

  listIncidents: async (page = 1, perPage = 20) => {
    const res = await api.get<PaginatedResponse<Incident>>("/itsm/incidents", {
      params: { page, per_page: perPage },
    });
    return res.data;
  },

  getIncident: async (id: string) => {
    const res = await api.get<{ data: Incident }>(`/itsm/incidents/${id}`);
    return res.data.data;
  },

  updateIncident: async (id: string, data: IncidentUpdate) => {
    const res = await api.put<{ data: Incident }>(
      `/itsm/incidents/${id}`,
      data
    );
    return res.data.data;
  },

  createChangeRequest: async (data: ChangeRequestCreate) => {
    const res = await api.post<{ data: ChangeRequest }>(
      "/itsm/changes",
      data
    );
    return res.data.data;
  },

  listChangeRequests: async (page = 1, perPage = 20) => {
    const res = await api.get<PaginatedResponse<ChangeRequest>>(
      "/itsm/changes",
      { params: { page, per_page: perPage } }
    );
    return res.data;
  },

  getChangeRequest: async (id: string) => {
    const res = await api.get<{ data: ChangeRequest }>(
      `/itsm/changes/${id}`
    );
    return res.data.data;
  },

  updateChangeRequest: async (
    id: string,
    data: ChangeRequestUpdate
  ) => {
    const res = await api.put<{ data: ChangeRequest }>(
      `/itsm/changes/${id}`,
      data
    );
    return res.data.data;
  },
};
