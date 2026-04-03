import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DollarSign, Plus, TrendingUp, TrendingDown, X } from "lucide-react";
import { costApi, CostRecordCreate, CostRecord } from "@/api/cost";
import { projectsApi } from "@/api/projects";

const CATEGORY_OPTIONS = [
  { value: "LABOR", label: "労務費" },
  { value: "MATERIAL", label: "材料費" },
  { value: "EQUIPMENT", label: "機械費" },
  { value: "SUBCONTRACT", label: "外注費" },
  { value: "OVERHEAD", label: "経費" },
] as const;

const CATEGORY_LABEL: Record<string, string> = {
  LABOR: "労務費",
  MATERIAL: "材料費",
  EQUIPMENT: "機械費",
  SUBCONTRACT: "外注費",
  OVERHEAD: "経費",
};

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("ja-JP", { style: "currency", currency: "JPY" }).format(amount);
}

export default function CostPage() {
  const queryClient = useQueryClient();
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<CostRecordCreate>({
    project_id: "",
    record_date: new Date().toISOString().split("T")[0],
    category: "MATERIAL",
    description: "",
    budgeted_amount: 0,
    actual_amount: 0,
  });

  const { data: projectsData } = useQuery({
    queryKey: ["projects"],
    queryFn: () => projectsApi.list(),
  });
  const projects = projectsData?.data ?? [];

  const { data: recordsData, isLoading: recordsLoading, error } = useQuery({
    queryKey: ["costs", selectedProjectId],
    queryFn: () => costApi.listCostRecords(selectedProjectId),
    enabled: !!selectedProjectId,
  });

  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ["costs-summary", selectedProjectId],
    queryFn: () => costApi.getCostSummary(selectedProjectId),
    enabled: !!selectedProjectId,
  });

  const isLoading = recordsLoading || summaryLoading;
  const records: CostRecord[] = recordsData?.data ?? [];

  const createMutation = useMutation({
    mutationFn: (data: CostRecordCreate) =>
      costApi.createCostRecord(data.project_id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["costs", selectedProjectId] });
      queryClient.invalidateQueries({ queryKey: ["costs-summary", selectedProjectId] });
      setShowModal(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (recordId: string) =>
      costApi.deleteCostRecord(selectedProjectId, recordId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["costs", selectedProjectId] });
      queryClient.invalidateQueries({ queryKey: ["costs-summary", selectedProjectId] });
    },
  });

  function handleDelete(recordId: string) {
    if (!window.confirm("この原価記録を削除しますか？")) return;
    deleteMutation.mutate(recordId);
  }

  function openModal() {
    setForm({
      project_id: selectedProjectId,
      record_date: new Date().toISOString().split("T")[0],
      category: "MATERIAL",
      description: "",
      budgeted_amount: 0,
      actual_amount: 0,
    });
    setShowModal(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    createMutation.mutate(form);
  }

  const isOver = (summary?.variance ?? 0) < 0;
  const achieveRate = summary && summary.total_budgeted > 0
    ? Math.round((summary.total_actual / summary.total_budgeted) * 100)
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <DollarSign className="w-7 h-7 text-primary-600" />
          原価管理
        </h2>
        <button className="btn-primary" onClick={openModal} disabled={!selectedProjectId}>
          <Plus className="w-4 h-4 mr-1" />
          新規原価記録
        </button>
      </div>

      <div className="card">
        <label className="block text-sm font-medium text-gray-700 mb-1">プロジェクト選択</label>
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
          <DollarSign className="w-12 h-12 mx-auto mb-3" />
          <p className="text-lg font-medium">プロジェクトを選択してください</p>
        </div>
      ) : isLoading ? (
        <div className="card text-center py-16 text-gray-400">読み込み中...</div>
      ) : (
        <>
          {summary && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="card">
                <p className="text-xs font-medium text-gray-500 mb-1">予算合計</p>
                <p className="text-xl font-bold text-gray-900">
                  {formatCurrency(summary.total_budgeted)}
                </p>
              </div>
              <div className="card">
                <p className="text-xs font-medium text-gray-500 mb-1">実績合計</p>
                <p className="text-xl font-bold text-gray-900">
                  {formatCurrency(summary.total_actual)}
                </p>
              </div>
              <div className="card">
                <p className="text-xs font-medium text-gray-500 mb-1">差異</p>
                <p className={`text-xl font-bold flex items-center gap-1 ${isOver ? "text-red-600" : "text-green-600"}`}>
                  {isOver ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                  {formatCurrency(Math.abs(summary.variance))}
                </p>
              </div>
              <div className="card">
                <p className="text-xs font-medium text-gray-500 mb-1">達成率</p>
                <p className={`text-xl font-bold ${achieveRate > 100 ? "text-red-600" : "text-green-600"}`}>
                  {achieveRate}%
                </p>
              </div>
            </div>
          )}

          {records.length === 0 ? (
            <div className="card text-center py-16 text-gray-400">
              <DollarSign className="w-12 h-12 mx-auto mb-3" />
              <p className="text-lg font-medium">原価記録がありません</p>
            </div>
          ) : (
            <div className="card p-0 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    {["日付", "カテゴリ", "説明", "予算", "実績", "差異", "操作"].map((h) => (
                      <th key={h} className="px-4 py-3 text-left font-medium text-gray-600">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {records.map((r) => {
                    const variance = (r.budgeted_amount ?? 0) - (r.actual_amount ?? 0);
                    return (
                      <tr key={r.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">{r.record_date}</td>
                        <td className="px-4 py-3">
                          <span className="badge-info">{CATEGORY_LABEL[r.category] ?? r.category}</span>
                        </td>
                        <td className="px-4 py-3 max-w-xs truncate">{r.description}</td>
                        <td className="px-4 py-3 text-right">{formatCurrency(r.budgeted_amount ?? 0)}</td>
                        <td className="px-4 py-3 text-right">{formatCurrency(r.actual_amount ?? 0)}</td>
                        <td className={`px-4 py-3 text-right font-medium ${variance < 0 ? "text-red-600" : "text-green-600"}`}>
                          {variance < 0 ? "▲" : "▼"}{formatCurrency(Math.abs(variance))}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <button
                              className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors"
                              onClick={() => window.alert("編集機能は今後対応予定です")}
                            >
                              編集
                            </button>
                            <button
                              className="text-xs px-2 py-1 rounded bg-red-100 text-red-700 hover:bg-red-200 transition-colors"
                              onClick={() => handleDelete(r.id)}
                            >
                              削除
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-lg font-semibold">新規原価記録作成</h3>
              <button onClick={() => setShowModal(false)}>
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">日付</label>
                <input type="date" className="input" value={form.record_date}
                  onChange={(e) => setForm({ ...form, record_date: e.target.value })} required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">カテゴリ</label>
                <select className="input" value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}>
                  {CATEGORY_OPTIONS.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">説明</label>
                <input type="text" className="input" value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })} required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">予算金額 (円)</label>
                  <input type="number" className="input" min={0} value={form.budgeted_amount ?? 0}
                    onChange={(e) => setForm({ ...form, budgeted_amount: Number(e.target.value) })} required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">実績金額 (円)</label>
                  <input type="number" className="input" min={0} value={form.actual_amount ?? 0}
                    onChange={(e) => setForm({ ...form, actual_amount: Number(e.target.value) })} required />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">業者名</label>
                <input type="text" className="input" value={form.vendor_name ?? ""}
                  onChange={(e) => setForm({ ...form, vendor_name: e.target.value })} />
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
