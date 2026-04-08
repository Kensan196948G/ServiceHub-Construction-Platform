import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Pencil } from "lucide-react";
import { Badge, Button, Card, FormField, Input, Select, Textarea } from "@/components/ui";
import { projectsApi, type Project, type ProjectCreate } from "@/api/projects";
import { STATUS_LABELS, STATUS_BADGE_VARIANT } from "../constants";

export function InfoTab({ project, projectId }: { project: Project; projectId: string }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Partial<ProjectCreate> & { status?: string }>({});
  const qc = useQueryClient();
  const mutation = useMutation({
    mutationFn: (data: Partial<ProjectCreate>) => projectsApi.update(projectId, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["project", projectId] }); setEditing(false); },
  });

  const startEdit = () => {
    setForm({
      project_code: project.project_code,
      name: project.name,
      client_name: project.client_name,
      site_address: project.site_address ?? "",
      status: project.status,
      start_date: project.start_date ?? "",
      end_date: project.end_date ?? "",
      budget: project.budget ?? undefined,
      description: project.description ?? "",
    });
    setEditing(true);
  };

  if (editing) {
    const fieldLabels: Record<string, string> = {
      project_code: "案件コード", name: "案件名", client_name: "施主名", site_address: "現場住所",
    };
    return (
      <Card className="space-y-4">
        <h4 className="font-semibold text-gray-900">基本情報を編集</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {(["project_code", "name", "client_name", "site_address"] as const).map((key) => (
            <FormField key={key} label={fieldLabels[key]} htmlFor={`edit-${key}`}>
              <Input
                id={`edit-${key}`}
                value={(form[key] as string) ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
              />
            </FormField>
          ))}
          <FormField label="ステータス" htmlFor="edit-status">
            <Select
              id="edit-status"
              value={form.status ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
              options={Object.entries(STATUS_LABELS).map(([v, l]) => ({ value: v, label: l }))}
            />
          </FormField>
          <FormField label="予算 (円)" htmlFor="edit-budget">
            <Input
              id="edit-budget"
              type="number"
              value={form.budget ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, budget: e.target.value ? Number(e.target.value) : undefined }))}
            />
          </FormField>
          <FormField label="開始日" htmlFor="edit-start-date">
            <Input
              id="edit-start-date"
              type="date"
              value={form.start_date ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, start_date: e.target.value }))}
            />
          </FormField>
          <FormField label="完了日" htmlFor="edit-end-date">
            <Input
              id="edit-end-date"
              type="date"
              value={form.end_date ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, end_date: e.target.value }))}
            />
          </FormField>
          <FormField label="説明" htmlFor="edit-description" className="sm:col-span-2">
            <Textarea
              id="edit-description"
              rows={3}
              value={form.description ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </FormField>
        </div>
        <div className="flex gap-2 justify-end">
          <Button variant="secondary" onClick={() => setEditing(false)}>キャンセル</Button>
          <Button variant="primary" loading={mutation.isPending} onClick={() => mutation.mutate(form)}>
            保存
          </Button>
        </div>
      </Card>
    );
  }

  const fields = [
    { label: "案件コード",  value: project.project_code },
    { label: "施主名",      value: project.client_name },
    { label: "現場住所",    value: project.site_address ?? "—" },
    { label: "開始日",      value: project.start_date ?? "—" },
    { label: "完了日",      value: project.end_date ?? "—" },
    { label: "予算",        value: project.budget != null ? `¥${project.budget.toLocaleString()}` : "—" },
    { label: "説明",        value: project.description ?? "—" },
  ];

  return (
    <Card className="space-y-4">
      <div className="flex justify-between items-center">
        <h4 className="font-semibold text-gray-900">基本情報</h4>
        <Button variant="secondary" size="sm" leftIcon={<Pencil className="w-4 h-4" />} onClick={startEdit}>
          編集
        </Button>
      </div>
      <div>
        <Badge variant={STATUS_BADGE_VARIANT[project.status] ?? "default"} size="sm">
          {STATUS_LABELS[project.status] ?? project.status}
        </Badge>
      </div>
      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
        {fields.map(({ label, value }) => (
          <div key={label}>
            <dt className="text-xs font-medium text-gray-500 uppercase">{label}</dt>
            <dd className="mt-1 text-sm text-gray-900">{value}</dd>
          </div>
        ))}
      </dl>
    </Card>
  );
}
