import api from "./client";

export interface NotificationEventChannels {
  email: boolean;
  slack: boolean;
}

export interface NotificationPreferences {
  email_enabled: boolean;
  slack_enabled: boolean;
  slack_webhook_url: string | null;
  events: Record<string, NotificationEventChannels>;
}

export interface NotificationPreferencesUpdate {
  email_enabled?: boolean;
  slack_enabled?: boolean;
  slack_webhook_url?: string | null;
  events?: Record<string, NotificationEventChannels>;
}

export const notificationPreferencesApi = {
  get: () =>
    api
      .get<{ data: NotificationPreferences }>("/users/me/notification-preferences")
      .then((r) => r.data.data),

  update: (data: NotificationPreferencesUpdate) =>
    api
      .patch<{ data: NotificationPreferences }>(
        "/users/me/notification-preferences",
        data,
      )
      .then((r) => r.data.data),
};
