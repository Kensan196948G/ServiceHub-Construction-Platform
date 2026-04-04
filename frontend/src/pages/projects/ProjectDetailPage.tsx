import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft, Building2, ClipboardList, FileText, ShieldCheck,
  DollarSign, Image, Plus, Pencil, CheckCircle, XCircle, Trash2,
} from "lucide-react";
import { Badge, Button, Card, Modal, FormField, Input, Select, Textarea, Skeleton } from "@/components/ui";
import { projectsApi, type Project, type ProjectCreate } from "@/api/projects";
import { dailyReportsApi, type DailyReport, type DailyReportCreate } from "@/api/daily_reports";
import { safetyApi, type SafetyCheck, type SafetyCheckCreate } from "@/api/safety";
import { costApi, type CostRecord, type CostRecordCreate } from "@/api/cost";
import { fetchPhotos, uploadPhoto, deletePhoto, type Photo } from "@/api/photos";

const STATUS_LABELS: Record<string, string> = {
  PLANNING: "計画中", IN_PROGRESS: "進行中", COMPLETED: "完了",
  SUSPENDED: "保留", CANCELLED: "中止",
};
const STATUS_BADGE_VARIANT: Record<string, "info" | "success" | "default" | "warning" | "danger"> = {
  PLANNING: "info",
  IN_PROGRESS: "success",
  COMPLETED: "default",
  SUSPENDED: "warning",
  CANCELLED: "danger",
};
const WEATHER_LABELS: Record<string, string> = {
  SUNNY: "☀️ 晴れ", CLOUDY: "☁️ 曇り", RAINY: "🌧️ 雨", SNOWY: "❄️ 雪",
};
const COST_CATEGORY_LABELS: Record<string, string> = {
  LABOR: "労務費", MATERIAL: "材料費", EQUIPMENT: "機械費",
  SUBCONTRACT: "外注費", OVERHEAD: "諸経費",
};
const PHOTO_CATEGORY_LABELS: Record<Photo["category"], string> = {
  GENERAL: "一般", PROGRESS: "工程", SAFETY: "安全",
  COMPLETION: "完了", TROUBLE: "障害",
};
const PHOTO_CATEGORY_VARIANT: Record<Photo["category"], "default" | "info" | "warning" | "success" | "danger"> = {
  GENERAL: "default",
  PROGRESS: "info",
  SAFETY: "warning",
  COMPLETION: "success",
  TROUBLE: "danger",
};

type TabKey = "info" | "reports" | "safety" | "cost" | "photos";

interface TabDef { key: TabKey; label: string; icon: React.ReactNode }
const TABS: TabDef[] = [
  { key: "info",    label: "基本情報",     icon: <ClipboardList className="w-4 h-4" /> },
  { key: "reports", label: "日報",         icon: <FileText className="w-4 h-4" /> },
  { key: "safety",  label: "安全チェック", icon: <ShieldCheck className="w-4 h-4" /> },
  { key: "cost",    label: "原価",         icon: <DollarSign className="w-4 h-4" /> },
  { key: "photos",  label: "写真",         icon: <Image className="w-4 h-4" /> },
];

function InfoTab({ project, projectId }: { project: Project; projectId: string }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Partial<ProjectCreate>>({});
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

function ReportsTab({ projectId }: { projectId: string }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<DailyReportCreate>({ project_id: projectId, report_date: "", worker_count: 1 });
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
      setForm({ project_id: projectId, report_date: "", worker_count: 1 });
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
        <h4 className="font-semibold text-gray-900">日報一覧</h4>
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
          <p className="text-gray-500 mb-4">日報がまだありません</p>
          <Button variant="primary" size="sm" onClick={() => setOpen(true)}>追加する</Button>
        </Card>
      ) : (
        <div className="space-y-3">
          {reports.map((r) => (
            <Card key={r.id} className="hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900">{r.report_date}</p>
                  <p className="text-sm text-gray-500 mt-1">
                    {r.weather ? (WEATHER_LABELS[r.weather] ?? r.weather) : "—"} ／ 作業員: {r.worker_count}名
                  </p>
                  {r.work_content && (
                    <p className="text-sm text-gray-700 mt-2 line-clamp-2">{r.work_content}</p>
                  )}
                </div>
                <div className="flex items-center gap-1 ml-4 shrink-0">
                  {r.progress_rate != null && (
                    <div className="text-right mr-2">
                      <p className="text-xs text-gray-500">進捗</p>
                      <p className="text-lg font-bold text-primary-600">{r.progress_rate}%</p>
                      <div className="w-20 h-2 bg-gray-200 rounded-full mt-1">
                        <div className="h-full bg-primary-600 rounded-full" style={{ width: `${r.progress_rate}%` }} />
                      </div>
                    </div>
                  )}
                  <button
                    className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                    onClick={() => startEdit(r)}
                    title="編集"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    onClick={() => handleDelete(r)}
                    title="削除"
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              {r.issues && (
                <div className="mt-3 p-2 bg-yellow-50 rounded-lg">
                  <p className="text-xs font-medium text-yellow-700">課題</p>
                  <p className="text-sm text-yellow-800 mt-0.5">{r.issues}</p>
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

function SafetyTab({ projectId }: { projectId: string }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<SafetyCheckCreate>({ project_id: projectId, check_date: "" });
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["safety-checks", projectId],
    queryFn: () => safetyApi.listSafetyChecks(projectId),
  });

  const mutation = useMutation({
    mutationFn: (d: SafetyCheckCreate) => safetyApi.createSafetyCheck(projectId, d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["safety-checks", projectId] });
      setOpen(false);
      setForm({ project_id: projectId, check_date: "" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (checkId: string) => safetyApi.deleteSafetyCheck(projectId, checkId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["safety-checks", projectId] }),
  });

  const handleDelete = (c: SafetyCheck) => {
    if (window.confirm(`安全チェック「${c.check_date}」を削除しますか？`)) {
      deleteMutation.mutate(c.id);
    }
  };

  const checks: SafetyCheck[] = data?.data ?? [];

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h4 className="font-semibold text-gray-900">安全チェック一覧</h4>
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
      ) : checks.length === 0 ? (
        <Card className="text-center py-12">
          <p className="text-4xl mb-3">🦺</p>
          <p className="text-gray-500 mb-4">安全チェックがまだありません</p>
          <Button variant="primary" size="sm" onClick={() => setOpen(true)}>追加する</Button>
        </Card>
      ) : (
        <div className="space-y-3">
          {checks.map((c) => (
            <Card key={c.id} className="hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-gray-900">{c.check_date}</p>
                    <Badge variant="info" size="sm">{c.check_type}</Badge>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    全{c.items_total}項目 ／ OK: {c.items_ok} ／ NG: {c.items_ng}
                  </p>
                  {c.notes && <p className="text-sm text-gray-700 mt-2">{c.notes}</p>}
                </div>
                <div className="ml-4 shrink-0 flex items-center gap-2">
                  {c.overall_result === "PASS" || c.overall_result === "OK" ? (
                    <><CheckCircle className="w-5 h-5 text-green-500" /><span className="text-sm font-medium text-green-600">合格</span></>
                  ) : (
                    <><XCircle className="w-5 h-5 text-red-500" /><span className="text-sm font-medium text-red-600">不合格</span></>
                  )}
                  <button
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    onClick={() => handleDelete(c)}
                    title="削除"
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="安全チェックを作成" size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField label="チェック日" htmlFor="safety-date" required>
              <Input
                id="safety-date"
                type="date"
                value={form.check_date}
                onChange={(e) => setForm((f) => ({ ...f, check_date: e.target.value }))}
              />
            </FormField>
            <FormField label="チェック種別" htmlFor="safety-type">
              <Input
                id="safety-type"
                placeholder="例: 朝礼前点検"
                value={form.check_type ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, check_type: e.target.value || undefined }))}
              />
            </FormField>
            <FormField label="総項目数" htmlFor="safety-total">
              <Input
                id="safety-total"
                type="number"
                min={0}
                value={form.items_total ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, items_total: e.target.value ? Number(e.target.value) : undefined }))}
              />
            </FormField>
            <FormField label="OK項目数" htmlFor="safety-ok">
              <Input
                id="safety-ok"
                type="number"
                min={0}
                value={form.items_ok ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, items_ok: e.target.value ? Number(e.target.value) : undefined }))}
              />
            </FormField>
            <FormField label="NG項目数" htmlFor="safety-ng">
              <Input
                id="safety-ng"
                type="number"
                min={0}
                value={form.items_ng ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, items_ng: e.target.value ? Number(e.target.value) : undefined }))}
              />
            </FormField>
            <FormField label="総合判定" htmlFor="safety-result">
              <Select
                id="safety-result"
                value={form.overall_result ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, overall_result: e.target.value || undefined }))}
                options={[
                  { value: "PASS", label: "合格 (PASS)" },
                  { value: "FAIL", label: "不合格 (FAIL)" },
                ]}
                placeholder="選択"
              />
            </FormField>
          </div>
          <FormField label="備考" htmlFor="safety-notes">
            <Textarea
              id="safety-notes"
              rows={2}
              value={form.notes ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value || undefined }))}
            />
          </FormField>
          <div className="flex gap-2 justify-end">
            <Button variant="secondary" onClick={() => setOpen(false)}>キャンセル</Button>
            <Button variant="primary" loading={mutation.isPending} disabled={!form.check_date}
              onClick={() => mutation.mutate(form)}>
              作成
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function CostTab({ projectId }: { projectId: string }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<CostRecordCreate>({
    project_id: projectId, record_date: "", category: "MATERIAL", description: "",
  });
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["cost-records", projectId],
    queryFn: () => costApi.listCostRecords(projectId),
  });
  const { data: summary } = useQuery({
    queryKey: ["cost-summary", projectId],
    queryFn: () => costApi.getCostSummary(projectId),
  });

  const mutation = useMutation({
    mutationFn: (d: CostRecordCreate) => costApi.createCostRecord(projectId, d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cost-records", projectId] });
      qc.invalidateQueries({ queryKey: ["cost-summary", projectId] });
      setOpen(false);
      setForm({ project_id: projectId, record_date: "", category: "MATERIAL", description: "" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (recordId: string) => costApi.deleteCostRecord(projectId, recordId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cost-records", projectId] });
      qc.invalidateQueries({ queryKey: ["cost-summary", projectId] });
    },
  });

  const handleDelete = (r: CostRecord) => {
    if (window.confirm(`原価記録「${r.description}」を削除しますか？`)) {
      deleteMutation.mutate(r.id);
    }
  };

  const records: CostRecord[] = data?.data ?? [];

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h4 className="font-semibold text-gray-900">原価管理</h4>
        <Button variant="primary" size="sm" leftIcon={<Plus className="w-4 h-4" />} onClick={() => setOpen(true)}>
          新規作成
        </Button>
      </div>

      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "予算合計", value: `¥${summary.total_budgeted.toLocaleString()}`, color: "text-gray-900" },
            { label: "実績合計", value: `¥${summary.total_actual.toLocaleString()}`, color: "text-gray-900" },
            { label: "差異", value: `¥${summary.variance.toLocaleString()}`, color: summary.variance >= 0 ? "text-green-600" : "text-red-600" },
            { label: "差異率", value: `${summary.variance_rate.toFixed(1)}%`, color: summary.variance_rate >= 0 ? "text-green-600" : "text-red-600" },
          ].map(({ label, value, color }) => (
            <Card key={label} className="text-center py-3">
              <p className="text-xs text-gray-500">{label}</p>
              <p className={`text-lg font-bold mt-1 ${color}`}>{value}</p>
            </Card>
          ))}
        </div>
      )}

      {isLoading ? (
        <Card className="space-y-3">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </Card>
      ) : records.length === 0 ? (
        <Card className="text-center py-12">
          <p className="text-4xl mb-3">💰</p>
          <p className="text-gray-500 mb-4">原価記録がまだありません</p>
          <Button variant="primary" size="sm" onClick={() => setOpen(true)}>追加する</Button>
        </Card>
      ) : (
        <Card padding="none">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-2 px-3 text-xs font-medium text-gray-500">日付</th>
                  <th className="text-left py-2 px-3 text-xs font-medium text-gray-500">カテゴリ</th>
                  <th className="text-left py-2 px-3 text-xs font-medium text-gray-500">内容</th>
                  <th className="text-right py-2 px-3 text-xs font-medium text-gray-500">予算</th>
                  <th className="text-right py-2 px-3 text-xs font-medium text-gray-500">実績</th>
                  <th className="text-right py-2 px-3 text-xs font-medium text-gray-500">差異</th>
                  <th className="py-2 px-3 text-xs font-medium text-gray-500"></th>
                </tr>
              </thead>
              <tbody>
                {records.map((r) => {
                  const diff = r.budgeted_amount - r.actual_amount;
                  return (
                    <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="py-2 px-3 text-gray-600">{r.record_date}</td>
                      <td className="py-2 px-3">
                        <Badge variant="info" size="sm">
                          {COST_CATEGORY_LABELS[r.category] ?? r.category}
                        </Badge>
                      </td>
                      <td className="py-2 px-3 text-gray-800 max-w-xs truncate">{r.description}</td>
                      <td className="py-2 px-3 text-right text-gray-600">¥{r.budgeted_amount.toLocaleString()}</td>
                      <td className="py-2 px-3 text-right text-gray-600">¥{r.actual_amount.toLocaleString()}</td>
                      <td className={`py-2 px-3 text-right font-medium ${diff >= 0 ? "text-green-600" : "text-red-600"}`}>
                        {diff >= 0 ? "+" : ""}¥{diff.toLocaleString()}
                      </td>
                      <td className="py-2 px-3 text-center">
                        <button
                          className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                          onClick={() => handleDelete(r)}
                          title="削除"
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="原価を記録" size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField label="日付" htmlFor="cost-date" required>
              <Input
                id="cost-date"
                type="date"
                value={form.record_date}
                onChange={(e) => setForm((f) => ({ ...f, record_date: e.target.value }))}
              />
            </FormField>
            <FormField label="カテゴリ" htmlFor="cost-category" required>
              <Select
                id="cost-category"
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                options={Object.entries(COST_CATEGORY_LABELS).map(([v, l]) => ({ value: v, label: l }))}
              />
            </FormField>
            <FormField label="内容" htmlFor="cost-description" required className="col-span-2">
              <Input
                id="cost-description"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
            </FormField>
            <FormField label="予算額 (円)" htmlFor="cost-budget">
              <Input
                id="cost-budget"
                type="number"
                min={0}
                value={form.budgeted_amount ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, budgeted_amount: e.target.value ? Number(e.target.value) : undefined }))}
              />
            </FormField>
            <FormField label="実績額 (円)" htmlFor="cost-actual">
              <Input
                id="cost-actual"
                type="number"
                min={0}
                value={form.actual_amount ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, actual_amount: e.target.value ? Number(e.target.value) : undefined }))}
              />
            </FormField>
            <FormField label="仕入先" htmlFor="cost-vendor" className="col-span-2">
              <Input
                id="cost-vendor"
                value={form.vendor_name ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, vendor_name: e.target.value || undefined }))}
              />
            </FormField>
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="secondary" onClick={() => setOpen(false)}>キャンセル</Button>
            <Button variant="primary" loading={mutation.isPending} disabled={!form.record_date || !form.description}
              onClick={() => mutation.mutate(form)}>
              作成
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function PhotosTab({ projectId }: { projectId: string }) {
  const [uploading, setUploading] = useState(false);
  const [category, setCategory] = useState<Photo["category"]>("GENERAL");
  const [error, setError] = useState<string | null>(null);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["photos", projectId],
    queryFn: () => fetchPhotos(projectId),
  });

  const photos: Photo[] = data?.data ?? [];

  const deleteMutation = useMutation({
    mutationFn: (photoId: string) => deletePhoto(projectId, photoId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["photos", projectId] }),
  });

  const handleDelete = (p: Photo) => {
    if (window.confirm(`写真「${p.original_filename}」を削除しますか？`)) {
      deleteMutation.mutate(p.id);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      await uploadPhoto(projectId, file, category);
      qc.invalidateQueries({ queryKey: ["photos", projectId] });
    } catch {
      setError("アップロードに失敗しました");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const photoCategoryOptions = (Object.keys(PHOTO_CATEGORY_LABELS) as Photo["category"][]).map(
    (c) => ({ value: c, label: PHOTO_CATEGORY_LABELS[c] })
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-between items-center gap-2">
        <h4 className="font-semibold text-gray-900">写真一覧</h4>
        <div className="flex items-center gap-2">
          <Select
            value={category}
            onChange={(e) => setCategory(e.target.value as Photo["category"])}
            options={photoCategoryOptions}
            className="py-1.5"
          />
          <label className="inline-flex items-center justify-center rounded-md font-medium transition-colors bg-primary-600 text-white hover:bg-primary-700 h-8 px-3 text-sm cursor-pointer gap-1">
            <Plus className="w-4 h-4" />
            {uploading ? "アップロード中…" : "写真を追加"}
            <input type="file" accept="image/*" className="hidden" onChange={handleUpload} disabled={uploading} />
          </label>
        </div>
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="aspect-square rounded-xl" />
          ))}
        </div>
      ) : photos.length === 0 ? (
        <Card className="text-center py-12">
          <p className="text-4xl mb-3">🖼️</p>
          <p className="text-gray-500 mb-4">写真がまだありません</p>
          <label className="inline-flex items-center justify-center rounded-md font-medium transition-colors bg-primary-600 text-white hover:bg-primary-700 h-8 px-3 text-sm cursor-pointer">
            追加する
            <input type="file" accept="image/*" className="hidden" onChange={handleUpload} disabled={uploading} />
          </label>
        </Card>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {photos.map((p) => (
            <div key={p.id} className="relative group rounded-xl overflow-hidden bg-gray-100 aspect-square">
              {p.url ? (
                <img src={p.url} alt={p.original_filename} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">
                  <Image className="w-8 h-8" />
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="absolute top-2 right-2">
                  <button
                    className="p-1.5 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors shadow"
                    onClick={() => handleDelete(p)}
                    title="削除"
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-2">
                  <Badge variant={PHOTO_CATEGORY_VARIANT[p.category]} size="sm">
                    {PHOTO_CATEGORY_LABELS[p.category]}
                  </Badge>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState<TabKey>("info");

  const { data: project, isLoading } = useQuery({
    queryKey: ["project", id],
    queryFn: () => projectsApi.get(id!),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <Card className="text-center py-12">
        <Skeleton className="h-8 w-48 mx-auto mb-4" />
        <Skeleton className="h-4 w-32 mx-auto" />
      </Card>
    );
  }
  if (!project || !id) {
    return <Card className="text-center py-12 text-red-400">案件が見つかりません</Card>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/projects" className="text-gray-400 hover:text-gray-600 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <Building2 className="w-6 h-6 text-primary-600" />
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{project.name}</h2>
          <p className="text-sm text-gray-500">{project.project_code}</p>
        </div>
      </div>

      <div className="border-b border-gray-200">
        <nav className="flex gap-1 -mb-px overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors ${
                activeTab === tab.key
                  ? "border-b-2 border-primary-600 text-primary-600"
                  : "text-gray-500 hover:text-gray-700 hover:border-b-2 hover:border-gray-300"
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      <div>
        {activeTab === "info"    && <InfoTab project={project} projectId={id} />}
        {activeTab === "reports" && <ReportsTab projectId={id} />}
        {activeTab === "safety"  && <SafetyTab projectId={id} />}
        {activeTab === "cost"    && <CostTab projectId={id} />}
        {activeTab === "photos"  && <PhotosTab projectId={id} />}
      </div>
    </div>
  );
}
