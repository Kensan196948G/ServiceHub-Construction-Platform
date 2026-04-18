import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Button, Card, Modal, FormField, Input, Select, Textarea, Skeleton } from "@/components/ui";
import { dailyReportsApi, type DailyReport, type DailyReportCreate } from "@/api/daily_reports";
import { WEATHER_LABELS } from "../constants";

export function ReportsTab({ projectId }: { projectId: string }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<DailyReportCreate>({ project_id: projectId, report_date: "", worker_count: 1, safety_check: false });
  const [editReport, setEditReport] = useState<DailyReport | null>(null);
  const [editForm, setEditForm] = useState<Partial<DailyReportCreate>>({});
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["daily-reports", projectId],
    queryFn: () => dailyReportsApi.list(projectId),
  });

  const mutation = useMutation({
    mutationFn: (d: DailyReportCreate) => dailyReportsApi.create(projectId, d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["daily-reports", projectId] });
      setOpen(false);
      setForm({ project_id: projectId, report_date: "", worker_count: 1, safety_check: false });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (reportId: string) => dailyReportsApi.delete(projectId, reportId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["daily-reports", projectId] }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<DailyReportCreate> }) =>
      dailyReportsApi.update(projectId, id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["daily-reports", projectId] });
      setEditReport(null);
    },
  });

  const handleDelete = (r: DailyReport) => {
    if (window.confirm(`日報「${r.report_date}」を削除しますか？`)) {
      deleteMutation.mutate(r.id);
    }
  };

  const startEdit = (r: DailyReport) => {
    setEditForm({
      report_date: r.report_date,
      weather: r.weather ?? undefined,
      temperature: r.temperature ?? undefined,
      worker_count: r.worker_count,
      work_content: r.work_content ?? undefined,
      safety_check: r.safety_check,
      safety_notes: r.safety_notes ?? undefined,
      progress_rate: r.progress_rate ?? undefined,
      issues: r.issues ?? undefined,
    });
    setEditReport(r);
  };

  const reports: DailyReport[] = data?.data ?? [];

  const weatherOptions = Object.entries(WEATHER_LABELS).map(([v, l]) => ({ value: v, label: l }));

  const reportFormFields = (
    f: Partial<DailyReportCreate>,
    setF: React.Dispatch<React.SetStateAction<Partial<DailyReportCreate>>>,
    prefix: string,
  ) => (
    <>
      <div className="grid grid-cols-2 gap-4">
        <FormField label="日付" htmlFor={`${prefix}-date`} required>
          <Input
            id={`${prefix}-date`}
            type="date"
            value={f.report_date ?? ""}
            onChange={(e) => setF((prev) => ({ ...prev, report_date: e.target.value }))}
          />
        </FormField>
        <FormField label="天気" htmlFor={`${prefix}-weather`}>
          <Select
            id={`${prefix}-weather`}
            value={f.weather ?? ""}
            onChange={(e) => setF((prev) => ({ ...prev, weather: e.target.value || undefined }))}
            options={weatherOptions}
            placeholder="選択"
          />
        </FormField>
        <FormField label="作業員数" htmlFor={`${prefix}-workers`}>
          <Input
            id={`${prefix}-workers`}
            type="number"
            min={0}
            value={f.worker_count ?? ""}
            onChange={(e) => setF((prev) => ({ ...prev, worker_count: Number(e.target.value) }))}
          />
        </FormField>
        <FormField label="進捗率 (%)" htmlFor={`${prefix}-progress`}>
          <Input
            id={`${prefix}-progress`}
            type="number"
            min={0}
            max={100}
            value={f.progress_rate ?? ""}
            onChange={(e) => setF((prev) => ({ ...prev, progress_rate: e.target.value ? Number(e.target.value) : undefined }))}
          />
        </FormField>
      </div>
      <FormField label="作業内容" htmlFor={`${prefix}-content`}>
        <Textarea
          id={`${prefix}-content`}
          rows={3}
          value={f.work_content ?? ""}
          onChange={(e) => setF((prev) => ({ ...prev, work_content: e.target.value || undefined }))}
        />
      </FormField>
      <FormField label="課題・特記事項" htmlFor={`${prefix}-issues`}>
        <Textarea
          id={`${prefix}-issues`}
          rows={2}
          value={f.issues ?? ""}
          onChange={(e) => setF((prev) => ({ ...prev, issues: e.target.value || undefined }))}
        />
      </FormField>
    </>
  );

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h4 className="font-semibold text-gray-900 dark:text-white">日報一覧</h4>
        <Button variant="primary" size="sm" leftIcon={<Plus className="w-4 h-4" />} onClick={() => setOpen(true)}>
          新規作成
        </Button>
      </div>

      {isLoading ? (
        <Card className="space-y-3">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </Card>
      ) : reports.length === 0 ? (
        <Card className="text-center py-12">
          <p className="text-4xl mb-3">📋</p>
          <p className="text-gray-500 dark:text-gray-400 mb-4">日報がまだありません</p>
          <Button variant="primary" size="sm" onClick={() => setOpen(true)}>追加する</Button>
        </Card>
      ) : (
        <div className="space-y-3">
          {reports.map((r) => (
            <Card key={r.id} className="hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 dark:text-white">{r.report_date}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {r.weather ? (WEATHER_LABELS[r.weather] ?? r.weather) : "—"} ／ 作業員: {r.worker_count}名
                  </p>
                  {r.work_content && (
                    <p className="text-sm text-gray-700 dark:text-gray-300 mt-2 line-clamp-2">{r.work_content}</p>
                  )}
                </div>
                <div className="flex items-center gap-1 ml-4 shrink-0">
                  {r.progress_rate != null && (
                    <div className="text-right mr-2">
                      <p className="text-xs text-gray-500 dark:text-gray-400">進捗</p>
                      <p className="text-lg font-bold text-primary-600">{r.progress_rate}%</p>
                      <div className="w-20 h-2 bg-gray-200 dark:bg-gray-600 rounded-full mt-1">
                        <div className="h-full bg-primary-600 rounded-full" style={{ width: `${r.progress_rate}%` }} />
                      </div>
                    </div>
                  )}
                  <button
                    className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/30 rounded-lg transition-colors"
                    onClick={() => startEdit(r)}
                    title="編集"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                    onClick={() => handleDelete(r)}
                    title="削除"
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              {r.issues && (
                <div className="mt-3 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                  <p className="text-xs font-medium text-yellow-700 dark:text-yellow-400">課題</p>
                  <p className="text-sm text-yellow-800 dark:text-yellow-300 mt-0.5">{r.issues}</p>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="日報を作成">
        <div className="space-y-4">
          {reportFormFields(form, setForm as React.Dispatch<React.SetStateAction<Partial<DailyReportCreate>>>, "create-report")}
          <div className="flex gap-2 justify-end">
            <Button variant="secondary" onClick={() => setOpen(false)}>キャンセル</Button>
            <Button variant="primary" loading={mutation.isPending} disabled={!form.report_date}
              onClick={() => mutation.mutate(form)}>
              作成
            </Button>
          </div>
        </div>
      </Modal>

      <Modal open={!!editReport} onClose={() => setEditReport(null)} title="日報を編集">
        <div className="space-y-4">
          {reportFormFields(editForm, setEditForm, "edit-report")}
          <div className="flex gap-2 justify-end">
            <Button variant="secondary" onClick={() => setEditReport(null)}>キャンセル</Button>
            <Button variant="primary" loading={updateMutation.isPending} disabled={!editForm.report_date}
              onClick={() => editReport && updateMutation.mutate({ id: editReport.id, data: editForm })}>
              保存
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
