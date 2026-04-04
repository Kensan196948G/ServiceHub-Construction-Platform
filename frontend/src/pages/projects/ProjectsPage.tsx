import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Plus, Search, Building2 } from "lucide-react";
import { projectsApi, ProjectCreate } from "@/api/projects";
import { Badge, Button, Card, Skeleton, Modal, FormField, Input, Select, Pagination } from "@/components/ui";

const STATUS_OPTIONS = [
  { value: "PLANNING", label: "計画中" },
  { value: "IN_PROGRESS", label: "進行中" },
  { value: "ON_HOLD", label: "保留" },
  { value: "COMPLETED", label: "完了" },
  { value: "CANCELLED", label: "中止" },
];

type BadgeVariant = "info" | "success" | "warning" | "danger";

const STATUS_VARIANT: Record<string, BadgeVariant> = {
  PLANNING: "info",
  IN_PROGRESS: "success",
  ON_HOLD: "warning",
  COMPLETED: "info",
  CANCELLED: "danger",
};

const STATUS_LABEL: Record<string, string> = {
  PLANNING: "計画中",
  IN_PROGRESS: "進行中",
  ON_HOLD: "保留",
  COMPLETED: "完了",
  CANCELLED: "中止",
};

export default function ProjectsPage() {
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [page, setPage] = useState(1);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["projects", page],
    queryFn: () => projectsApi.list(page, 20),
  });

  const createMutation = useMutation({
    mutationFn: (d: ProjectCreate) => projectsApi.create(d),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      setShowModal(false);
    },
  });

  const filtered = data?.data.filter(
    (p) =>
      p.name.includes(search) ||
      p.project_code.includes(search) ||
      p.client_name.includes(search),
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">工事案件一覧</h2>
        <Button leftIcon={<Plus className="w-4 h-4" />} onClick={() => setShowModal(true)}>
          新規案件
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="案件名・コード・施主で検索..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
        />
      </div>

      {/* Table */}
      {isLoading ? (
        <Card className="space-y-3">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
        </Card>
      ) : (
        <Card padding="none" className="overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">案件コード</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">案件名</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase hidden md:table-cell">施主</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase hidden lg:table-cell">期間</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">ステータス</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {(filtered ?? []).map((p) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-500">{p.project_code}</td>
                  <td className="px-4 py-3">
                    <Link
                      to={`/projects/${p.id}`}
                      className="text-sm font-medium text-primary-600 hover:text-primary-700"
                    >
                      {p.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 hidden md:table-cell">{p.client_name}</td>
                  <td className="px-4 py-3 text-sm text-gray-500 hidden lg:table-cell">
                    {p.start_date ?? "—"} 〜 {p.end_date ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={STATUS_VARIANT[p.status] ?? "info"} size="sm">
                      {STATUS_LABEL[p.status] ?? p.status}
                    </Badge>
                  </td>
                </tr>
              ))}
              {(filtered ?? []).length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-400 text-sm">
                    <Building2 className="w-8 h-8 mx-auto mb-2" />
                    案件がありません
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Pagination */}
          {data && (
            <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between text-sm text-gray-600">
              <span>全 {data.meta.total} 件</span>
              <Pagination
                page={page}
                totalPages={data.meta.total_pages ?? data.meta.pages ?? 1}
                onPageChange={setPage}
              />
            </div>
          )}
        </Card>
      )}

      {/* Create Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title="新規工事案件">
        <CreateProjectForm
          onClose={() => setShowModal(false)}
          onSubmit={(d) => createMutation.mutate(d)}
          loading={createMutation.isPending}
          statusOptions={STATUS_OPTIONS}
        />
      </Modal>
    </div>
  );
}

function CreateProjectForm({
  onClose,
  onSubmit,
  loading,
  statusOptions,
}: {
  onClose: () => void;
  onSubmit: (d: ProjectCreate) => void;
  loading: boolean;
  statusOptions: { value: string; label: string }[];
}) {
  const [form, setForm] = useState<ProjectCreate & { location?: string }>({
    project_code: "",
    name: "",
    client_name: "",
    status: "PLANNING",
    description: "",
    location: "",
  });
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const { location, ...rest } = form as ProjectCreate & { location?: string };
    onSubmit({ ...rest, site_address: location } as unknown as ProjectCreate);
  };

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="grid grid-cols-2 gap-4">
        <FormField label="案件コード" htmlFor="project_code" required>
          <Input id="project_code" name="project_code" required value={form.project_code} onChange={handleChange} />
        </FormField>
        <FormField label="ステータス" htmlFor="status" required>
          <Select id="status" name="status" value={form.status} onChange={handleChange} options={statusOptions} />
        </FormField>
      </div>
      <FormField label="案件名" htmlFor="name" required>
        <Input id="name" name="name" required value={form.name} onChange={handleChange} />
      </FormField>
      <FormField label="施主名" htmlFor="client_name" required>
        <Input id="client_name" name="client_name" required value={form.client_name} onChange={handleChange} />
      </FormField>
      <FormField label="現場住所" htmlFor="location">
        <Input id="location" name="location" value={form.location} onChange={handleChange} />
      </FormField>
      <FormField label="説明" htmlFor="description">
        <textarea id="description" name="description" rows={3} value={form.description} onChange={handleChange}
          className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-500" />
      </FormField>
      <div className="flex gap-3 justify-end pt-2">
        <Button type="button" variant="secondary" onClick={onClose}>キャンセル</Button>
        <Button type="submit" loading={loading}>作成</Button>
      </div>
    </form>
  );
}
