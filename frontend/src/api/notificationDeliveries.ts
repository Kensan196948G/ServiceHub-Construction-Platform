import api from "./client";

export interface NotificationDelivery {
  id: string;
  user_id: string;
  event_key: string;
  channel: "EMAIL" | "SLACK";
  status: "PENDING" | "SENT" | "FAILED";
  failure_kind: "transient" | "permanent" | null;
  attempts: number;
  subject: string | null;
  body_preview: string | null;
  created_at: string;
  updated_at: string;
}

export interface PaginationMeta {
  total: number;
  page: number;
  per_page: number;
  pages: number;
}

export interface DeliveriesListResponse {
  data: NotificationDelivery[];
  meta: PaginationMeta;
}

export interface RetryResponse {
  retried_count: number;
  message: string;
}

export const notificationDeliveriesApi = {
  list: (params?: {
    page?: number;
    per_page?: number;
    status?: string;
    channel?: string;
    event_key?: string;
  }) =>
    api
      .get<DeliveriesListResponse>("/notifications/deliveries", { params })
      .then((r) => r.data),

  retry: () =>
    api
      .post<{ data: RetryResponse }>("/notifications/retry")
      .then((r) => r.data.data),
};
