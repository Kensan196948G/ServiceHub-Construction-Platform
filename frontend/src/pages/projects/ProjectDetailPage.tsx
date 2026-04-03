import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft, Building2, ClipboardList, FileText, ShieldCheck,
  DollarSign, Image, Plus, X, Pencil, CheckCircle, XCircle,
} from "lucide-react";
import { projectsApi, type Project, type ProjectCreate } from "@/api/projects";
import { dailyReportsApi, type DailyReport, type DailyReportCreate } from "@/api/daily_reports";
import { safetyApi, type SafetyCheck, type SafetyCheckCreate } from "@/api/safety";
import { costApi, type CostRecord, type CostRecordCreate } from "@/api/cost";
import { fetchPhotos, uploadPhoto, type Photo } from "@/api/photos";

const STATUS_LABELS: Record<string, string> = {
  PLANNING: "計画中", IN_PROGRESS: "進行中", COMPLETED: "完了",
  SUSPENDED: "保留", CANCELLED: "中止",
};
const STATUS_BADGE: Record<string, string> = {
  PLANNING: "bg-blue-100 text-blue-700",
  IN_PROGRESS: "bg-green-100 text-green-700",
  COMPLETED: "bg-gray-100 text-gray-700",
  SUSPENDED: "bg-yellow-100 text-yellow-700",
  CANCELLED: "bg-red-100 text-red-700",
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
const PHOTO_CATEGORY_COLORS: Record<Photo["category"], string> = {
  GENERAL: "bg-gray-100 text-gray-700",
  PROGRESS: "bg-blue-100 text-blue-700",
  SAFETY: "bg-yellow-100 text-yellow-700",
  COMPLETION: "bg-green-100 text-green-700",
  TROUBLE: "bg-red-100 text-red-700",
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

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

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
    return (
      <div className="card space-y-4">
        <h4 className="font-semibold text-gray-900">基本情報を編集</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {(["project_code", "name", "client_name", "site_address"] as const).map((key) => (
            <div key={key}>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                {{ project_code: "案件コード", name: "案件名", client_name: "施主名", site_address: "現場住所" }[key]}
              </label>
              <input
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                value={(form[key] as string) ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
              />
            </div>
          ))}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">ステータス</label>
            <select
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              value={form.status ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
            >
              {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">予算 (円)</label>
            <input
              type="number"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              value={form.budget ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, budget: e.target.value ? Number(e.target.value) : undefined }))}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">開始日</label>
            <input type="date"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              value={form.start_date ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, start_date: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">完了日</label>
            <input type="date"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              value={form.end_date ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, end_date: e.target.value }))}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-gray-500 mb-1">説明</label>
            <textarea
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              rows={3}
              value={form.description ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </div>
        </div>
        <div className="flex gap-2 justify-end">
          <button className="btn-secondary" onClick={() => setEditing(false)}>キャンセル</button>
          <button className="btn-primary" disabled={mutation.isPending} onClick={() => mutation.mutate(form)}>
            {mutation.isPending ? "保存中…" : "保存"}
          </button>
        </div>
      </div>
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
    <div className="card space-y-4">
      <div className="flex justify-between items-center">
        <h4 className="font-semibold text-gray-900">基本情報</h4>
        <button className="btn-secondary flex items-center gap-1 text-sm" onClick={startEdit}>
          <Pencil className="w-4 h-4" /> 編集
        </button>
      </div>
      <div>
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[project.status] ?? "bg-gray-100 text-gray-700"}`}>
          {STATUS_LABELS[project.status] ?? project.status}
        </span>
      </div>
      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
        {fields.map(({ label, value }) => (
          <div key={label}>
            <dt className="text-xs font-medium text-gray-500 uppercase">{label}</dt>
            <dd className="mt-1 text-sm text-gray-900">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
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

  const reportFormFields = (
    f: Partial<DailyReportCreate>,
    setF: React.Dispatch<React.SetStateAction<Partial<DailyReportCreate>>>
  ) => (
    <>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">日付 *</label>
          <input type="date"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            value={f.report_date ?? ""}
            onChange={(e) => setF((prev) => ({ ...prev, report_date: e.target.value }))}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">天気</label>
          <select
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            value={f.weather ?? ""}
            onChange={(e) => setF((prev) => ({ ...prev, weather: e.target.value || undefined }))}
          >
            <option value="">選択</option>
            {Object.entries(WEATHER_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">作業員数</label>
          <input type="number" min={0}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            value={f.worker_count ?? ""}
            onChange={(e) => setF((prev) => ({ ...prev, worker_count: Number(e.target.value) }))}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">進捗率 (%)</label>
          <input type="number" min={0} max={100}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            value={f.progress_rate ?? ""}
            onChange={(e) => setF((prev) => ({ ...prev, progress_rate: e.target.value ? Number(e.target.value) : undefined }))}
          />
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">作業内容</label>
        <textarea
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          rows={3}
          value={f.work_content ?? ""}
          onChange={(e) => setF((prev) => ({ ...prev, work_content: e.target.value || undefined }))}
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">課題・特記事項</label>
        <textarea
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          rows={2}
          value={f.issues ?? ""}
          onChange={(e) => setF((prev) => ({ ...prev, issues: e.target.value || undefined }))}
        />
      </div>
    </>
  );

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h4 className="font-semibold text-gray-900">日報一覧</h4>
        <button className="btn-primary flex items-center gap-1 text-sm" onClick={() => setOpen(true)}>
          <Plus className="w-4 h-4" /> 新規作成
        </button>
      </div>

      {isLoading ? (
        <p className="text-center text-gray-400 py-8">読み込み中…</p>
      ) : reports.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-4xl mb-3">📋</p>
          <p className="text-gray-500 mb-4">日報がまだありません</p>
          <button className="btn-primary text-sm" onClick={() => setOpen(true)}>追加する</button>
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map((r) => (
            <div key={r.id} className="card hover:shadow-md transition-shadow">
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
            </div>
          ))}
        </div>
      )}

      {open && (
        <Modal title="日報を作成" onClose={() => setOpen(false)}>
          <div className="space-y-4">
            {reportFormFields(form, setForm as React.Dispatch<React.SetStateAction<Partial<DailyReportCreate>>>)}
            <div className="flex gap-2 justify-end">
              <button className="btn-secondary" onClick={() => setOpen(false)}>キャンセル</button>
              <button className="btn-primary" disabled={mutation.isPending || !form.report_date}
                onClick={() => mutation.mutate(form)}>
                {mutation.isPending ? "保存中…" : "作成"}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {editReport && (
        <Modal title="日報を編集" onClose={() => setEditReport(null)}>
          <div className="space-y-4">
            {reportFormFields(editForm, setEditForm)}
            <div className="flex gap-2 justify-end">
              <button className="btn-secondary" onClick={() => setEditReport(null)}>キャンセル</button>
              <button className="btn-primary" disabled={updateMutation.isPending || !editForm.report_date}
                onClick={() => updateMutation.mutate({ id: editReport.id, data: editForm })}>
                {updateMutation.isPending ? "保存中…" : "保存"}
              </button>
            </div>
          </div>
        </Modal>
      )}
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
        <button className="btn-primary flex items-center gap-1 text-sm" onClick={() => setOpen(true)}>
          <Plus className="w-4 h-4" /> 新規作成
        </button>
      </div>

      {isLoading ? (
        <p className="text-center text-gray-400 py-8">読み込み中…</p>
      ) : checks.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-4xl mb-3">🦺</p>
          <p className="text-gray-500 mb-4">安全チェックがまだありません</p>
          <button className="btn-primary text-sm" onClick={() => setOpen(true)}>追加する</button>
        </div>
      ) : (
        <div className="space-y-3">
          {checks.map((c) => (
            <div key={c.id} className="card hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-gray-900">{c.check_date}</p>
                    <span className="text-xs px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full">{c.check_type}</span>
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
            </div>
          ))}
        </div>
      )}

      {open && (
        <Modal title="安全チェックを作成" onClose={() => setOpen(false)}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">チェック日 *</label>
                <input type="date"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  value={form.check_date}
                  onChange={(e) => setForm((f) => ({ ...f, check_date: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">チェック種別</label>
                <input
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="例: 朝礼前点検"
                  value={form.check_type ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, check_type: e.target.value || undefined }))}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">総項目数</label>
                <input type="number" min={0}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  value={form.items_total ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, items_total: e.target.value ? Number(e.target.value) : undefined }))}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">OK項目数</label>
                <input type="number" min={0}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  value={form.items_ok ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, items_ok: e.target.value ? Number(e.target.value) : undefined }))}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">NG項目数</label>
                <input type="number" min={0}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  value={form.items_ng ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, items_ng: e.target.value ? Number(e.target.value) : undefined }))}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">総合判定</label>
                <select
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  value={form.overall_result ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, overall_result: e.target.value || undefined }))}
                >
                  <option value="">選択</option>
                  <option value="PASS">合格 (PASS)</option>
                  <option value="FAIL">不合格 (FAIL)</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">備考</label>
              <textarea
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                rows={2}
                value={form.notes ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value || undefined }))}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <button className="btn-secondary" onClick={() => setOpen(false)}>キャンセル</button>
              <button className="btn-primary" disabled={mutation.isPending || !form.check_date}
                onClick={() => mutation.mutate(form)}>
                {mutation.isPending ? "保存中…" : "作成"}
              </button>
            </div>
          </div>
        </Modal>
      )}
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
        <button className="btn-primary flex items-center gap-1 text-sm" onClick={() => setOpen(true)}>
          <Plus className="w-4 h-4" /> 新規作成
        </button>
      </div>

      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "予算合計", value: `¥${summary.total_budgeted.toLocaleString()}`, color: "text-gray-900" },
            { label: "実績合計", value: `¥${summary.total_actual.toLocaleString()}`, color: "text-gray-900" },
            { label: "差異", value: `¥${summary.variance.toLocaleString()}`, color: summary.variance >= 0 ? "text-green-600" : "text-red-600" },
            { label: "差異率", value: `${summary.variance_rate.toFixed(1)}%`, color: summary.variance_rate >= 0 ? "text-green-600" : "text-red-600" },
          ].map(({ label, value, color }) => (
            <div key={label} className="card text-center py-3">
              <p className="text-xs text-gray-500">{label}</p>
              <p className={`text-lg font-bold mt-1 ${color}`}>{value}</p>
            </div>
          ))}
        </div>
      )}

      {isLoading ? (
        <p className="text-center text-gray-400 py-8">読み込み中…</p>
      ) : records.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-4xl mb-3">💰</p>
          <p className="text-gray-500 mb-4">原価記録がまだありません</p>
          <button className="btn-primary text-sm" onClick={() => setOpen(true)}>追加する</button>
        </div>
      ) : (
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
                      <span className="text-xs px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full">
                        {COST_CATEGORY_LABELS[r.category] ?? r.category}
                      </span>
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
      )}

      {open && (
        <Modal title="原価を記録" onClose={() => setOpen(false)}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">日付 *</label>
                <input type="date"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  value={form.record_date}
                  onChange={(e) => setForm((f) => ({ ...f, record_date: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">カテゴリ *</label>
                <select
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  value={form.category}
                  onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                >
                  {Object.entries(COST_CATEGORY_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-500 mb-1">内容 *</label>
                <input
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">予算額 (円)</label>
                <input type="number" min={0}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  value={form.budgeted_amount ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, budgeted_amount: e.target.value ? Number(e.target.value) : undefined }))}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">実績額 (円)</label>
                <input type="number" min={0}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  value={form.actual_amount ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, actual_amount: e.target.value ? Number(e.target.value) : undefined }))}
                />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-500 mb-1">仕入先</label>
                <input
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  value={form.vendor_name ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, vendor_name: e.target.value || undefined }))}
                />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button className="btn-secondary" onClick={() => setOpen(false)}>キャンセル</button>
              <button className="btn-primary" disabled={mutation.isPending || !form.record_date || !form.description}
                onClick={() => mutation.mutate(form)}>
                {mutation.isPending ? "保存中…" : "作成"}
              </button>
            </div>
          </div>
        </Modal>
      )}
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

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-between items-center gap-2">
        <h4 className="font-semibold text-gray-900">写真一覧</h4>
        <div className="flex items-center gap-2">
          <select
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            value={category}
            onChange={(e) => setCategory(e.target.value as Photo["category"])}
          >
            {(Object.keys(PHOTO_CATEGORY_LABELS) as Photo["category"][]).map((c) => (
              <option key={c} value={c}>{PHOTO_CATEGORY_LABELS[c]}</option>
            ))}
          </select>
          <label className="btn-primary flex items-center gap-1 text-sm cursor-pointer">
            <Plus className="w-4 h-4" />
            {uploading ? "アップロード中…" : "写真を追加"}
            <input type="file" accept="image/*" className="hidden" onChange={handleUpload} disabled={uploading} />
          </label>
        </div>
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

      {isLoading ? (
        <p className="text-center text-gray-400 py-8">読み込み中…</p>
      ) : photos.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-4xl mb-3">🖼️</p>
          <p className="text-gray-500 mb-4">写真がまだありません</p>
          <label className="btn-primary text-sm cursor-pointer">
            追加する
            <input type="file" accept="image/*" className="hidden" onChange={handleUpload} disabled={uploading} />
          </label>
        </div>
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
                  <span className={`text-xs px-1.5 py-0.5 rounded ${PHOTO_CATEGORY_COLORS[p.category]}`}>
                    {PHOTO_CATEGORY_LABELS[p.category]}
                  </span>
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
    return <div className="card text-center py-12 text-gray-400">読み込み中…</div>;
  }
  if (!project || !id) {
    return <div className="card text-center py-12 text-red-400">案件が見つかりません</div>;
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
