import api from "./client";
import type { PaginatedResponse } from "./projects";
import type {
  IncidentResponse,
  IncidentCreate,
  IncidentUpdate,
  ChangeRequestResponse,
  ChangeRequestCreate,
  ChangeRequestUpdate,
} from "@/generated";

// Re-export with backward-compatible aliases
export type Incident = IncidentResponse;
export type ChangeRequest = ChangeRequestResponse;
export type { IncidentCreate, IncidentUpdate, ChangeRequestCreate, ChangeRequestUpdate };

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
    const res = await api.patch<{ data: Incident }>(
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
    const res = await api.patch<{ data: ChangeRequest }>(
      `/itsm/changes/${id}`,
      data
    );
    return res.data.data;
  },
};
