import { useState } from "react";
import { useAuthStore } from "@/stores/authStore";
import api from "@/api/client";

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

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">設定</h1>

      {/* Profile card */}
      <section className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-700 mb-4">プロフィール</h2>
        <dl className="space-y-3">
          <div className="flex gap-4">
            <dt className="w-28 text-sm text-gray-500 shrink-0">氏名</dt>
            <dd className="text-sm text-gray-900 font-medium">{user?.full_name ?? "—"}</dd>
          </div>
          <div className="flex gap-4">
            <dt className="w-28 text-sm text-gray-500 shrink-0">メールアドレス</dt>
            <dd className="text-sm text-gray-900">{user?.email ?? "—"}</dd>
          </div>
          <div className="flex gap-4">
            <dt className="w-28 text-sm text-gray-500 shrink-0">権限</dt>
            <dd className="text-sm text-gray-900">
              {user?.role ? (ROLE_LABELS[user.role] ?? user.role) : "—"}
            </dd>
          </div>
        </dl>
      </section>

      {/* Password change */}
      <section className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-700 mb-4">パスワード変更</h2>

        {successMsg && (
          <div role="status" className="mb-4 p-3 rounded bg-green-50 text-green-700 text-sm">
            {successMsg}
          </div>
        )}
        {errorMsg && (
          <div role="alert" className="mb-4 p-3 rounded bg-red-50 text-red-700 text-sm">
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
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
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
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
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
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
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
              className="px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-50 transition-colors"
            >
              キャンセル
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
