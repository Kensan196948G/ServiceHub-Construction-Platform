import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { FileText, Plus, CloudSun, X, ChevronDown, ChevronUp } from "lucide-react";
import { dailyReportsApi, DailyReportCreate } from "@/api/daily_reports";
import { projectsApi } from "@/api/projects";

const WEATHER_OPTIONS = [
  { value: "SUNNY", label: "晴れ ☀️" },
  { value: "CLOUDY", label: "曇り ☁️" },
  { value: "RAINY", label: "雨 🌧️" },
  { value: "SNOWY", label: "雪 ❄️" },
] as const;

const WEATHER_LABEL: Record<string, string> = {
  SUNNY: "晴れ ☀️",
  CLOUDY: "曇り ☁️",
  RAINY: "雨 🌧️",
  SNOWY: "雪 ❄️",
  晴れ: "晴れ ☀️",
  曇り: "曇り ☁️",
  雨: "雨 🌧️",
  雪: "雪 ❄️",
};

const STATUS_LABEL: Record<string, string> = {
  draft: "下書き",
  submitted: "提出済",
  approved: "承認済",
  DRAFT: "下書き",
  SUBMITTED: "提出済",
  APPROVED: "承認済",
};
const STATUS_BADGE: Record<string, string> = {
  draft: "badge-secondary",
  DRAFT: "badge-secondary",
  submitted: "badge-info",
  SUBMITTED: "badge-info",
  approved: "badge-success",
  APPROVED: "badge-success",
};

interface FormState extends DailyReportCreate {
  _status: string;
}

export default function DailyReportsPage() {
  const queryClient = useQueryClient();
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [expandedReportId, setExpandedReportId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>({
    project_id: "",
    report_date: new Date().toISOString().split("T")[0],
    weather: "SUNNY",
    worker_count: 1,
    progress_rate: 0,
    safety_check: true,
    _status: "draft",
  });

  const { data: projectsData } = useQuery({
    queryKey: ["projects"],
    queryFn: () => projectsApi.list(),
  });
  const projects = projectsData?.data ?? [];

  const { data: reportsData, isLoading, error } = useQuery({
    queryKey: ["daily-reports", selectedProjectId],
    queryFn: () => dailyReportsApi.list(selectedProjectId),
    enabled: !!selectedProjectId,
  });
  const reports = reportsData?.data ?? [];

  const createMutation = useMutation({
    mutationFn: (data: DailyReportCreate) =>
      dailyReportsApi.create(data.project_id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["daily-reports", selectedProjectId] });
      setShowModal(false);
    },
  });

  function openModal() {
    setForm({
      project_id: selectedProjectId,
      report_date: new Date().toISOString().split("T")[0],
      weather: "SUNNY",
      worker_count: 1,
      progress_rate: 0,
      safety_check: true,
      _status: "draft",
    });
    setShowModal(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const { _status, ...createData } = form;
    void _status;
    createMutation.mutate(createData);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <FileText className="w-7 h-7 text-primary-600" />
          日報管理
        </h2>
        <button
          className="btn-primary"
          onClick={openModal}
          disabled={!selectedProjectId}
        >
          <Plus className="w-4 h-4 mr-1" />
          新規日報作成
        </button>
      </div>

      <div className="card">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          プロジェクト選択
        </label>
        <select
          className="input w-64"
          value={selectedProjectId}
          onChange={(e) => setSelectedProjectId(e.target.value)}
        >
          <option value="">-- プロジェクトを選択 --</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.project_code} - {p.name}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-300 text-red-700 px-4 py-3 rounded">
          データの取得に失敗しました。
        </div>
      )}

      {!selectedProjectId ? (
        <div className="card text-center py-16 text-gray-400">
          <FileText className="w-12 h-12 mx-auto mb-3" />
          <p className="text-lg font-medium">プロジェクトを選択してください</p>
        </div>
      ) : isLoading ? (
        <div className="card text-center py-16 text-gray-400">読み込み中...</div>
      ) : reports.length === 0 ? (
        <div className="card text-center py-16 text-gray-400">
          <CloudSun className="w-12 h-12 mx-auto mb-3" />
          <p className="text-lg font-medium">日報がまだありません</p>
          <p className="text-sm mt-1">「新規日報作成」から追加してください</p>
        </div>
      ) : (
        <div className="card p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {["報告日", "天気", "作業員数", "進捗率", "安全確認", "ステータス", ""].map((h, i) => (
                  <th key={i} className="px-4 py-3 text-left font-medium text-gray-600">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {reports.map((r) => {
                const isExpanded = expandedReportId === r.id;
                return (
                  <React.Fragment key={r.id}>
                    <tr
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => setExpandedReportId(isExpanded ? null : r.id)}
                    >
                      <td className="px-4 py-3">{r.report_date}</td>
                      <td className="px-4 py-3">{WEATHER_LABEL[r.weather ?? ""] ?? r.weather ?? "—"}</td>
                      <td className="px-4 py-3">{r.worker_count}名</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-24 bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-primary-600 h-2 rounded-full"
                              style={{ width: `${r.progress_rate ?? 0}%` }}
                            />
                          </div>
                          <span>{r.progress_rate ?? 0}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {r.safety_check ? (
                          <span className="badge-success">確認済</span>
                        ) : (
                          <span className="badge-danger">未確認</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={STATUS_BADGE[r.status] ?? "badge-info"}>
                          {STATUS_LABEL[r.status] ?? r.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-400">
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr className="bg-blue-50">
                        <td colSpan={7} className="px-6 py-4">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                            <div>
                              <p className="font-medium text-gray-700 mb-1">作業内容</p>
                              <p className="text-gray-600 whitespace-pre-wrap">
                                {r.work_content || "—"}
                              </p>
                            </div>
                            <div>
                              <p className="font-medium text-gray-700 mb-1">安全メモ</p>
                              <p className="text-gray-600 whitespace-pre-wrap">
                                {r.safety_notes || "—"}
                              </p>
                            </div>
                            <div>
                              <p className="font-medium text-gray-700 mb-1">課題・特記事項</p>
                              <p className="text-gray-600 whitespace-pre-wrap">
                                {r.issues || "—"}
                              </p>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-white">
              <h3 className="text-lg font-semibold">新規日報作成</h3>
              <button onClick={() => setShowModal(false)}>
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">報告日</label>
                <input
                  type="date"
                  className="input"
                  value={form.report_date}
                  onChange={(e) => setForm({ ...form, report_date: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">天気</label>
                <select
                  className="input"
                  value={form.weather ?? "SUNNY"}
                  onChange={(e) => setForm({ ...form, weather: e.target.value })}
                >
                  {WEATHER_OPTIONS.map((w) => (
                    <option key={w.value} value={w.value}>{w.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">作業員数</label>
                <input
                  type="number"
                  className="input"
                  min={0}
                  value={form.worker_count ?? 0}
                  onChange={(e) => setForm({ ...form, worker_count: Number(e.target.value) })}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  進捗率: {form.progress_rate ?? 0}%
                </label>
                <input
                  type="range"
                  className="w-full accent-primary-600"
                  min={0}
                  max={100}
                  step={5}
                  value={form.progress_rate ?? 0}
                  onChange={(e) => setForm({ ...form, progress_rate: Number(e.target.value) })}
                />
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>0%</span>
                  <span>50%</span>
                  <span>100%</span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">作業内容</label>
                <textarea
                  className="input"
                  rows={3}
                  value={form.work_content ?? ""}
                  onChange={(e) => setForm({ ...form, work_content: e.target.value })}
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="safety_check"
                  checked={form.safety_check ?? false}
                  onChange={(e) => setForm({ ...form, safety_check: e.target.checked })}
                />
                <label htmlFor="safety_check" className="text-sm font-medium text-gray-700">
                  安全確認済
                </label>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">安全メモ</label>
                <textarea
                  className="input"
                  rows={2}
                  value={form.safety_notes ?? ""}
                  onChange={(e) => setForm({ ...form, safety_notes: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">課題・特記事項</label>
                <textarea
                  className="input"
                  rows={2}
                  value={form.issues ?? ""}
                  onChange={(e) => setForm({ ...form, issues: e.target.value })}
                />
              </div>
              {createMutation.isError && (
                <p className="text-red-600 text-sm">作成に失敗しました。</p>
              )}
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>
                  キャンセル
                </button>
                <button type="submit" className="btn-primary" disabled={createMutation.isPending}>
                  {createMutation.isPending ? "作成中..." : "作成"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
