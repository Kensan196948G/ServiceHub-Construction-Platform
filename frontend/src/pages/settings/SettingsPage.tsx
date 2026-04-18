import { useEffect, useState } from "react";
import { useAuthStore } from "@/stores/authStore";
import api from "@/api/client";
import {
  notificationPreferencesApi,
  type NotificationPreferences,
} from "@/api/notificationPreferences";

interface PasswordForm {
  current_password: string;
  new_password: string;
  confirm_password: string;
}

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "管理者",
  MANAGER: "マネージャー",
  WORKER: "作業員",
};

const EVENT_LABELS: Record<string, string> = {
  daily_report_submitted: "日報提出時",
  safety_incident_created: "安全インシデント発生時",
  change_request_pending_approval: "変更要求承認待ち",
  incident_assigned: "ITSM インシデント割当時",
  project_status_changed: "案件ステータス変更時",
};

export default function SettingsPage() {
  const user = useAuthStore((s) => s.user);

  const [form, setForm] = useState<PasswordForm>({
    current_password: "",
    new_password: "",
    confirm_password: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Notification preferences state
  const [prefs, setPrefs] = useState<NotificationPreferences | null>(null);
  const [prefsLoading, setPrefsLoading] = useState(true);
  const [prefsSaving, setPrefsSaving] = useState(false);
  const [prefsSuccessMsg, setPrefsSuccessMsg] = useState<string | null>(null);
  const [prefsErrorMsg, setPrefsErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    notificationPreferencesApi
      .get()
      .then((data) => {
        if (!cancelled) setPrefs(data);
      })
      .catch(() => {
        if (!cancelled) setPrefsErrorMsg("通知設定の取得に失敗しました");
      })
      .finally(() => {
        if (!cancelled) setPrefsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setSuccessMsg(null);
    setErrorMsg(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg(null);
    setErrorMsg(null);

    if (form.new_password !== form.confirm_password) {
      setErrorMsg("新しいパスワードが一致しません");
      return;
    }
    if (form.new_password.length < 8) {
      setErrorMsg("パスワードは8文字以上で入力してください");
      return;
    }

    setSubmitting(true);
    try {
      await api.patch("/users/me/password", {
        current_password: form.current_password,
        new_password: form.new_password,
      });
      setSuccessMsg("パスワードを変更しました");
      setForm({ current_password: "", new_password: "", confirm_password: "" });
    } catch {
      setErrorMsg("パスワードの変更に失敗しました");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    setForm({ current_password: "", new_password: "", confirm_password: "" });
    setSuccessMsg(null);
    setErrorMsg(null);
  };

  const updatePref = <K extends keyof NotificationPreferences>(
    key: K,
    value: NotificationPreferences[K],
  ) => {
    setPrefs((prev) => (prev ? { ...prev, [key]: value } : prev));
    setPrefsSuccessMsg(null);
    setPrefsErrorMsg(null);
  };

  const toggleEventChannel = (
    eventKey: string,
    channel: "email" | "slack",
  ) => {
    setPrefs((prev) => {
      if (!prev) return prev;
      const current = prev.events[eventKey] ?? { email: false, slack: false };
      return {
        ...prev,
        events: {
          ...prev.events,
          [eventKey]: { ...current, [channel]: !current[channel] },
        },
      };
    });
    setPrefsSuccessMsg(null);
    setPrefsErrorMsg(null);
  };

  const handleSavePrefs = async () => {
    if (!prefs) return;
    setPrefsSuccessMsg(null);
    setPrefsErrorMsg(null);
    setPrefsSaving(true);
    try {
      const updated = await notificationPreferencesApi.update({
        email_enabled: prefs.email_enabled,
        slack_enabled: prefs.slack_enabled,
        slack_webhook_url: prefs.slack_webhook_url,
        events: prefs.events,
      });
      setPrefs(updated);
      setPrefsSuccessMsg("通知設定を保存しました");
    } catch {
      setPrefsErrorMsg("通知設定の保存に失敗しました");
    } finally {
      setPrefsSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-800 dark:text-white">設定</h1>

      {/* Profile card */}
      <section className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-4">プロフィール</h2>
        <dl className="space-y-3">
          <div className="flex gap-4">
            <dt className="w-28 text-sm text-gray-500 dark:text-gray-400 shrink-0">氏名</dt>
            <dd className="text-sm text-gray-900 dark:text-gray-100 font-medium">{user?.full_name ?? "—"}</dd>
          </div>
          <div className="flex gap-4">
            <dt className="w-28 text-sm text-gray-500 dark:text-gray-400 shrink-0">メールアドレス</dt>
            <dd className="text-sm text-gray-900 dark:text-gray-100">{user?.email ?? "—"}</dd>
          </div>
          <div className="flex gap-4">
            <dt className="w-28 text-sm text-gray-500 dark:text-gray-400 shrink-0">権限</dt>
            <dd className="text-sm text-gray-900 dark:text-gray-100">
              {user?.role ? (ROLE_LABELS[user.role] ?? user.role) : "—"}
            </dd>
          </div>
        </dl>
      </section>

      {/* Password change */}
      <section className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-4">パスワード変更</h2>

        {successMsg && (
          <div role="status" className="mb-4 p-3 rounded bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-sm">
            {successMsg}
          </div>
        )}
        {errorMsg && (
          <div role="alert" className="mb-4 p-3 rounded bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-sm">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="current_password" className="block text-sm font-medium text-gray-700 mb-1">
              現在のパスワード
            </label>
            <input
              id="current_password"
              name="current_password"
              type="password"
              required
              value={form.current_password}
              onChange={handleChange}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div>
            <label htmlFor="new_password" className="block text-sm font-medium text-gray-700 mb-1">
              新しいパスワード
            </label>
            <input
              id="new_password"
              name="new_password"
              type="password"
              required
              value={form.new_password}
              onChange={handleChange}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div>
            <label htmlFor="confirm_password" className="block text-sm font-medium text-gray-700 mb-1">
              新しいパスワード（確認）
            </label>
            <input
              id="confirm_password"
              name="confirm_password"
              type="password"
              required
              value={form.confirm_password}
              onChange={handleChange}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-md hover:bg-primary-700 disabled:opacity-50 transition-colors"
            >
              {submitting ? "更新中…" : "パスワードを変更"}
            </button>
            <button
              type="button"
              onClick={handleCancel}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              キャンセル
            </button>
          </div>
        </form>
      </section>

      {/* Notification preferences */}
      <section
        className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6"
        data-testid="notification-preferences-section"
      >
        <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-4">通知設定</h2>

        {prefsSuccessMsg && (
          <div
            role="status"
            className="mb-4 p-3 rounded bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-sm"
          >
            {prefsSuccessMsg}
          </div>
        )}
        {prefsErrorMsg && (
          <div
            role="alert"
            className="mb-4 p-3 rounded bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-sm"
          >
            {prefsErrorMsg}
          </div>
        )}

        {prefsLoading ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">読み込み中…</p>
        ) : prefs ? (
          <div className="space-y-6">
            {/* Channel master switches */}
            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={prefs.email_enabled}
                  onChange={(e) => updatePref("email_enabled", e.target.checked)}
                  className="w-4 h-4 text-primary-600 rounded border-gray-300 focus:ring-primary-500"
                  aria-label="メール通知を有効にする"
                />
                <span className="text-sm text-gray-800 dark:text-gray-200">
                  メール通知を有効にする
                </span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={prefs.slack_enabled}
                  onChange={(e) => updatePref("slack_enabled", e.target.checked)}
                  className="w-4 h-4 text-primary-600 rounded border-gray-300 focus:ring-primary-500"
                  aria-label="Slack 通知を有効にする"
                />
                <span className="text-sm text-gray-800 dark:text-gray-200">
                  Slack 通知を有効にする
                </span>
              </label>
            </div>

            {/* Slack webhook URL */}
            {prefs.slack_enabled && (
              <div>
                <label
                  htmlFor="slack_webhook_url"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  Slack Webhook URL
                </label>
                <input
                  id="slack_webhook_url"
                  type="password"
                  value={prefs.slack_webhook_url ?? ""}
                  onChange={(e) =>
                    updatePref("slack_webhook_url", e.target.value || null)
                  }
                  placeholder="https://hooks.slack.com/services/..."
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Slack Incoming Webhook の URL を入力してください
                </p>
              </div>
            )}

            {/* Per-event settings */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                イベント別通知
              </h3>
              <div className="border border-gray-200 dark:border-gray-700 rounded-md overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="text-left px-3 py-2 font-medium text-gray-600 dark:text-gray-300">
                        イベント
                      </th>
                      <th className="text-center px-3 py-2 font-medium text-gray-600 dark:text-gray-300 w-20">
                        メール
                      </th>
                      <th className="text-center px-3 py-2 font-medium text-gray-600 dark:text-gray-300 w-20">
                        Slack
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {Object.entries(EVENT_LABELS).map(([key, label]) => {
                      const channels = prefs.events[key] ?? {
                        email: false,
                        slack: false,
                      };
                      return (
                        <tr key={key}>
                          <td className="px-3 py-2 text-gray-800 dark:text-gray-200">{label}</td>
                          <td className="px-3 py-2 text-center">
                            <input
                              type="checkbox"
                              checked={channels.email}
                              onChange={() => toggleEventChannel(key, "email")}
                              className="w-4 h-4 text-primary-600 rounded border-gray-300 focus:ring-primary-500"
                              aria-label={`${label} のメール通知`}
                            />
                          </td>
                          <td className="px-3 py-2 text-center">
                            <input
                              type="checkbox"
                              checked={channels.slack}
                              onChange={() => toggleEventChannel(key, "slack")}
                              className="w-4 h-4 text-primary-600 rounded border-gray-300 focus:ring-primary-500"
                              aria-label={`${label} の Slack 通知`}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Save button */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={handleSavePrefs}
                disabled={prefsSaving}
                className="px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-md hover:bg-primary-700 disabled:opacity-50 transition-colors"
              >
                {prefsSaving ? "保存中…" : "通知設定を保存"}
              </button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-500 dark:text-gray-400">通知設定を表示できません</p>
        )}
      </section>
    </div>
  );
}
