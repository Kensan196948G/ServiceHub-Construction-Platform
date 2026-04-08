import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Users } from "lucide-react";
import { usersApi, User, UserCreate, UserUpdate } from "@/api/users";
import { useAuthStore } from "@/stores/authStore";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { FormField, Input, Select } from "@/components/ui/FormField";
import { Skeleton } from "@/components/ui/Skeleton";
import { Pagination } from "@/components/ui/Pagination";

const ROLE_OPTIONS = [
  "ADMIN",
  "PROJECT_MANAGER",
  "SITE_SUPERVISOR",
  "COST_MANAGER",
  "SAFETY_OFFICER",
  "IT_OPERATOR",
  "VIEWER",
];

const ROLE_SELECT_OPTIONS = ROLE_OPTIONS.map((r) => ({ value: r, label: r }));

const ROLE_BADGE_VARIANT: Record<string, "default" | "success" | "warning" | "danger" | "info"> = {
  ADMIN: "danger",
  PROJECT_MANAGER: "info",
  SITE_SUPERVISOR: "success",
  COST_MANAGER: "warning",
  SAFETY_OFFICER: "warning",
  IT_OPERATOR: "default",
  VIEWER: "default",
};

function CreateUserModal({
  onClose,
  onSubmit,
  loading,
}: {
  onClose: () => void;
  onSubmit: (data: UserCreate) => void;
  loading: boolean;
}) {
  const [form, setForm] = useState<UserCreate>({
    email: "",
    full_name: "",
    password: "",
    role: "VIEWER",
  });

  return (
    <Modal open={true} onClose={onClose} title="新規ユーザー作成" size="sm">
      <div className="space-y-4">
        <FormField label="メールアドレス" htmlFor="create-email" required>
          <Input
            id="create-email"
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
        </FormField>
        <FormField label="氏名" htmlFor="create-name" required>
          <Input
            id="create-name"
            type="text"
            value={form.full_name}
            onChange={(e) => setForm({ ...form, full_name: e.target.value })}
          />
        </FormField>
        <FormField label="パスワード（8文字以上）" htmlFor="create-password" required>
          <Input
            id="create-password"
            type="password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
        </FormField>
        <FormField label="ロール" htmlFor="create-role">
          <Select
            id="create-role"
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value })}
            options={ROLE_SELECT_OPTIONS}
          />
        </FormField>
      </div>
      <div className="mt-6 flex justify-end gap-3">
        <Button variant="secondary" onClick={onClose} disabled={loading}>
          キャンセル
        </Button>
        <Button
          variant="primary"
          onClick={() => onSubmit(form)}
          loading={loading}
          disabled={!form.email || !form.full_name || form.password.length < 8}
        >
          作成
        </Button>
      </div>
    </Modal>
  );
}

function EditUserModal({
  user,
  onClose,
  onSubmit,
  loading,
}: {
  user: User;
  onClose: () => void;
  onSubmit: (data: UserUpdate) => void;
  loading: boolean;
}) {
  const [form, setForm] = useState<UserUpdate>({
    role: user.role,
    is_active: user.is_active,
  });

  return (
    <Modal open={true} onClose={onClose} title="ユーザー編集" size="sm">
      <p className="text-sm text-gray-500 -mt-2 mb-4">{user.email}</p>
      <div className="space-y-4">
        <FormField label="ロール" htmlFor="edit-role">
          <Select
            id="edit-role"
            value={form.role ?? ""}
            onChange={(e) => setForm({ ...form, role: e.target.value })}
            options={ROLE_SELECT_OPTIONS}
          />
        </FormField>
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="is_active"
            checked={form.is_active ?? false}
            onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
            className="w-4 h-4 text-primary-600 rounded border-gray-300"
          />
          <label htmlFor="is_active" className="text-sm font-medium text-gray-700">
            アクティブ
          </label>
        </div>
      </div>
      <div className="mt-6 flex justify-end gap-3">
        <Button variant="secondary" onClick={onClose} disabled={loading}>
          キャンセル
        </Button>
        <Button variant="primary" onClick={() => onSubmit(form)} loading={loading}>
          保存
        </Button>
      </div>
    </Modal>
  );
}

export default function UsersPage() {
  const currentUser = useAuthStore((s) => s.user);
  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const [editTarget, setEditTarget] = useState<User | null>(null);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["users", page],
    queryFn: () => usersApi.list(page, 20),
    enabled: currentUser?.role === "ADMIN",
  });

  const createMutation = useMutation({
    mutationFn: (d: UserCreate) => usersApi.create(d),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setShowCreate(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UserUpdate }) =>
      usersApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setEditTarget(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => usersApi.deleteUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });

  function handleDelete(u: User) {
    if (u.id === currentUser?.id) {
      alert("自分自身は削除できません。");
      return;
    }
    if (window.confirm(`「${u.full_name}」を削除しますか？この操作は取り消せません。`)) {
      deleteMutation.mutate(u.id);
    }
  }

  if (currentUser?.role !== "ADMIN") {
    return (
      <Card className="text-center py-16">
        <Users className="w-12 h-12 mx-auto text-gray-300 mb-3" />
        <p className="text-gray-500">このページはADMINのみアクセス可能です。</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">ユーザー管理</h2>
        <Button variant="primary" onClick={() => setShowCreate(true)} leftIcon={<Plus className="w-4 h-4" />}>
          新規ユーザー作成
        </Button>
      </div>

      {isLoading ? (
        <Card>
          <div className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </Card>
      ) : (
        <>
          <Card padding="none" className="overflow-hidden">
            <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    氏名 / メール
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    ロール
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase hidden md:table-cell">
                    ステータス
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase hidden lg:table-cell">
                    最終ログイン
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase hidden lg:table-cell">
                    作成日
                  </th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {(data?.data ?? []).map((u: User) => (
                  <tr key={u.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-gray-900">{u.full_name}</p>
                      <p className="text-xs text-gray-500">{u.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={ROLE_BADGE_VARIANT[u.role] ?? "default"} size="sm">
                        {u.role}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <Badge variant={u.is_active ? "success" : "default"} size="sm">
                        {u.is_active ? "有効" : "無効"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 hidden lg:table-cell">
                      {u.last_login_at
                        ? new Date(u.last_login_at).toLocaleString("ja-JP")
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 hidden lg:table-cell">
                      {new Date(u.created_at).toLocaleDateString("ja-JP")}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditTarget(u)}
                        >
                          編集
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => handleDelete(u)}
                          disabled={u.id === currentUser?.id || deleteMutation.isPending}
                        >
                          削除
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </Card>

          {data?.meta && (
            <Pagination
              page={page}
              totalPages={data.meta.pages}
              onPageChange={setPage}
            />
          )}
        </>
      )}

      {showCreate && (
        <CreateUserModal
          onClose={() => setShowCreate(false)}
          onSubmit={(d) => createMutation.mutate(d)}
          loading={createMutation.isPending}
        />
      )}

      {editTarget && (
        <EditUserModal
          user={editTarget}
          onClose={() => setEditTarget(null)}
          onSubmit={(d) => updateMutation.mutate({ id: editTarget.id, data: d })}
          loading={updateMutation.isPending}
        />
      )}
    </div>
  );
}
