import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, Plus, RefreshCw, X, Pencil } from "lucide-react";
import { itsmApi, IncidentCreate, ChangeRequestCreate, Incident, ChangeRequest, IncidentUpdate, ChangeRequestUpdate } from "@/api/itsm";

type Tab = "incidents" | "changes";

const PRIORITY_BADGE: Record<string, string> = {
  critical: "badge-danger",
  high: "badge-danger",
  medium: "badge-warning",
  low: "badge-info",
};
const PRIORITY_LABEL: Record<string, string> = {
  critical: "緊急",
  high: "高",
  medium: "中",
  low: "低",
};
const SEVERITY_BADGE: Record<string, string> = {
  critical: "badge-danger",
  major: "badge-warning",
  minor: "badge-info",
};
const SEVERITY_LABEL: Record<string, string> = {
  critical: "重大",
  major: "中度",
  minor: "軽微",
};
const STATUS_BADGE: Record<string, string> = {
  open: "badge-danger",
  in_progress: "badge-warning",
  resolved: "badge-success",
  closed: "badge-info",
  pending: "badge-warning",
  approved: "badge-success",
  rejected: "badge-danger",
  implemented: "badge-success",
};
const STATUS_LABEL: Record<string, string> = {
  open: "オープン",
  in_progress: "対応中",
  resolved: "解決済",
  closed: "クローズ",
  pending: "保留中",
  approved: "承認済",
  rejected: "却下",
  implemented: "実施済",
};
const RISK_BADGE: Record<string, string> = {
  high: "badge-danger",
  medium: "badge-warning",
  low: "badge-info",
};
const RISK_LABEL: Record<string, string> = { high: "高", medium: "中", low: "低" };

export default function ItsmPage() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>("incidents");
  const [showModal, setShowModal] = useState(false);
  const [editingIncident, setEditingIncident] = useState<Incident | null>(null);
  const [editingChange, setEditingChange] = useState<ChangeRequest | null>(null);
  const [incidentEditForm, setIncidentEditForm] = useState<IncidentUpdate>({});
  const [changeEditForm, setChangeEditForm] = useState<ChangeRequestUpdate>({});

  const [incidentForm, setIncidentForm] = useState<IncidentCreate>({
    title: "",
    description: "",
    category: "infrastructure",
    priority: "medium",
    severity: "minor",
  });

  const [changeForm, setChangeForm] = useState<ChangeRequestCreate>({
    title: "",
    description: "",
    change_type: "normal",
    risk_level: "medium",
  });

  const { data: incidentsData, isLoading: incidentsLoading } = useQuery({
    queryKey: ["incidents"],
    queryFn: () => itsmApi.listIncidents(),
    enabled: tab === "incidents",
  });

  const { data: changesData, isLoading: changesLoading } = useQuery({
    queryKey: ["changes"],
    queryFn: () => itsmApi.listChangeRequests(),
    enabled: tab === "changes",
  });

  const incidents = incidentsData?.data ?? [];
  const changes = changesData?.data ?? [];
  const isLoading = tab === "incidents" ? incidentsLoading : changesLoading;

  const createIncidentMutation = useMutation({
    mutationFn: (data: IncidentCreate) => itsmApi.createIncident(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["incidents"] });
      setShowModal(false);
    },
  });

  const createChangeMutation = useMutation({
    mutationFn: (data: ChangeRequestCreate) => itsmApi.createChangeRequest(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["changes"] });
      setShowModal(false);
    },
  });

  const updateIncidentMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: IncidentUpdate }) =>
      itsmApi.updateIncident(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["incidents"] });
      setEditingIncident(null);
    },
  });

  const updateChangeMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: ChangeRequestUpdate }) =>
      itsmApi.updateChangeRequest(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["changes"] });
      setEditingChange(null);
    },
  });

  function openEditIncident(inc: Incident) {
    setEditingIncident(inc);
    setIncidentEditForm({
      title: inc.title,
      description: inc.description,
      category: inc.category,
      priority: inc.priority,
      severity: inc.severity,
      status: inc.status,
    });
  }

  function openEditChange(cr: ChangeRequest) {
    setEditingChange(cr);
    setChangeEditForm({
      title: cr.title,
      description: cr.description,
      change_type: cr.change_type,
      risk_level: cr.risk_level,
      status: cr.status,
      impact: cr.impact ?? "",
    });
  }

  function handleIncidentEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingIncident) return;
    updateIncidentMutation.mutate({ id: editingIncident.id, data: incidentEditForm });
  }

  function handleChangeEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingChange) return;
    updateChangeMutation.mutate({ id: editingChange.id, data: changeEditForm });
  }

  function openModal() {
    if (tab === "incidents") {
      setIncidentForm({ title: "", description: "", category: "infrastructure", priority: "medium", severity: "minor" });
    } else {
      setChangeForm({ title: "", description: "", change_type: "normal", risk_level: "medium" });
    }
    setShowModal(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (tab === "incidents") {
      createIncidentMutation.mutate(incidentForm);
    } else {
      createChangeMutation.mutate(changeForm);
    }
  }

  const isPending = createIncidentMutation.isPending || createChangeMutation.isPending;
  const isError = createIncidentMutation.isError || createChangeMutation.isError;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <AlertCircle className="w-7 h-7 text-primary-600" />
          ITSM（インシデント・変更管理）
        </h2>
        <button className="btn-primary" onClick={openModal}>
          <Plus className="w-4 h-4 mr-1" />
          新規作成
        </button>
      </div>

      <div className="flex gap-1 border-b border-gray-200">
        {(["incidents", "changes"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium flex items-center gap-1 border-b-2 transition-colors ${
              tab === t
                ? "border-primary-600 text-primary-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {t === "incidents" ? (
              <><AlertCircle className="w-4 h-4" />インシデント管理</>
            ) : (
              <><RefreshCw className="w-4 h-4" />変更要求管理</>
            )}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="card text-center py-16 text-gray-400">読み込み中...</div>
      ) : tab === "incidents" ? (
        incidents.length === 0 ? (
          <div className="card text-center py-16 text-gray-400">
            <AlertCircle className="w-12 h-12 mx-auto mb-3" />
            <p className="text-lg font-medium">インシデントがありません</p>
          </div>
        ) : (
          <div className="card p-0 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {["番号", "タイトル", "カテゴリ", "優先度", "重大度", "ステータス", "操作"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left font-medium text-gray-600">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {incidents.map((inc) => (
                  <tr key={inc.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs">{inc.incident_number}</td>
                    <td className="px-4 py-3 font-medium max-w-xs truncate">{inc.title}</td>
                    <td className="px-4 py-3">{inc.category}</td>
                    <td className="px-4 py-3">
                      <span className={PRIORITY_BADGE[inc.priority] ?? "badge-info"}>
                        {PRIORITY_LABEL[inc.priority] ?? inc.priority}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={SEVERITY_BADGE[inc.severity] ?? "badge-info"}>
                        {SEVERITY_LABEL[inc.severity] ?? inc.severity}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={STATUS_BADGE[inc.status] ?? "badge-info"}>
                        {STATUS_LABEL[inc.status] ?? inc.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors flex items-center gap-1"
                        onClick={() => openEditIncident(inc)}
                      >
                        <Pencil className="w-3 h-3" />詳細/編集
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : changes.length === 0 ? (
        <div className="card text-center py-16 text-gray-400">
          <RefreshCw className="w-12 h-12 mx-auto mb-3" />
          <p className="text-lg font-medium">変更要求がありません</p>
        </div>
      ) : (
        <div className="card p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {["変更番号", "タイトル", "変更タイプ", "リスク", "ステータス", "操作"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left font-medium text-gray-600">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {changes.map((cr) => (
                <tr key={cr.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs">{cr.change_number}</td>
                  <td className="px-4 py-3 font-medium max-w-xs truncate">{cr.title}</td>
                  <td className="px-4 py-3">{cr.change_type}</td>
                  <td className="px-4 py-3">
                    <span className={RISK_BADGE[cr.risk_level] ?? "badge-info"}>
                      {RISK_LABEL[cr.risk_level] ?? cr.risk_level}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={STATUS_BADGE[cr.status] ?? "badge-info"}>
                      {STATUS_LABEL[cr.status] ?? cr.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors flex items-center gap-1"
                      onClick={() => openEditChange(cr)}
                    >
                      <Pencil className="w-3 h-3" />詳細/編集
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-lg font-semibold">
                {tab === "incidents" ? "インシデント新規作成" : "変更要求新規作成"}
              </h3>
              <button onClick={() => setShowModal(false)}>
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {tab === "incidents" ? (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">タイトル</label>
                    <input type="text" className="input" value={incidentForm.title}
                      onChange={(e) => setIncidentForm({ ...incidentForm, title: e.target.value })} required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">説明</label>
                    <textarea className="input" rows={3} value={incidentForm.description}
                      onChange={(e) => setIncidentForm({ ...incidentForm, description: e.target.value })} required />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">カテゴリ</label>
                      <select className="input" value={incidentForm.category ?? "infrastructure"}
                        onChange={(e) => setIncidentForm({ ...incidentForm, category: e.target.value })}>
                        <option value="infrastructure">インフラ</option>
                        <option value="application">アプリ</option>
                        <option value="security">セキュリティ</option>
                        <option value="other">その他</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">優先度</label>
                      <select className="input" value={incidentForm.priority ?? "medium"}
                        onChange={(e) => setIncidentForm({ ...incidentForm, priority: e.target.value })}>
                        <option value="critical">緊急</option>
                        <option value="high">高</option>
                        <option value="medium">中</option>
                        <option value="low">低</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">重大度</label>
                    <select className="input" value={incidentForm.severity ?? "minor"}
                      onChange={(e) => setIncidentForm({ ...incidentForm, severity: e.target.value })}>
                      <option value="critical">重大</option>
                      <option value="major">中度</option>
                      <option value="minor">軽微</option>
                    </select>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">タイトル</label>
                    <input type="text" className="input" value={changeForm.title}
                      onChange={(e) => setChangeForm({ ...changeForm, title: e.target.value })} required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">説明</label>
                    <textarea className="input" rows={3} value={changeForm.description}
                      onChange={(e) => setChangeForm({ ...changeForm, description: e.target.value })} required />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">変更タイプ</label>
                      <select className="input" value={changeForm.change_type ?? "normal"}
                        onChange={(e) => setChangeForm({ ...changeForm, change_type: e.target.value })}>
                        <option value="normal">標準</option>
                        <option value="emergency">緊急</option>
                        <option value="standard">定型</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">リスク</label>
                      <select className="input" value={changeForm.risk_level ?? "medium"}
                        onChange={(e) => setChangeForm({ ...changeForm, risk_level: e.target.value })}>
                        <option value="high">高</option>
                        <option value="medium">中</option>
                        <option value="low">低</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">影響範囲</label>
                    <textarea className="input" rows={2} value={changeForm.impact ?? ""}
                      onChange={(e) => setChangeForm({ ...changeForm, impact: e.target.value })} />
                  </div>
                </>
              )}
              {isError && <p className="text-red-600 text-sm">作成に失敗しました。</p>}
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>
                  キャンセル
                </button>
                <button type="submit" className="btn-primary" disabled={isPending}>
                  {isPending ? "作成中..." : "作成"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* インシデント編集モーダル */}
      {editingIncident && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-lg font-semibold">インシデント編集</h3>
              <button onClick={() => setEditingIncident(null)}>
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); updateIncidentMutation.mutate({ id: editingIncident.id, data: incidentEditForm }); }} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">タイトル</label>
                <input type="text" className="input" value={incidentEditForm.title ?? ""}
                  onChange={(e) => setIncidentEditForm({ ...incidentEditForm, title: e.target.value })} required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">説明</label>
                <textarea className="input" rows={3} value={incidentEditForm.description ?? ""}
                  onChange={(e) => setIncidentEditForm({ ...incidentEditForm, description: e.target.value })} required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">カテゴリ</label>
                  <select className="input" value={incidentEditForm.category ?? "infrastructure"}
                    onChange={(e) => setIncidentEditForm({ ...incidentEditForm, category: e.target.value })}>
                    <option value="infrastructure">インフラ</option>
                    <option value="application">アプリ</option>
                    <option value="security">セキュリティ</option>
                    <option value="other">その他</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">優先度</label>
                  <select className="input" value={incidentEditForm.priority ?? "medium"}
                    onChange={(e) => setIncidentEditForm({ ...incidentEditForm, priority: e.target.value })}>
                    <option value="critical">緊急</option>
                    <option value="high">高</option>
                    <option value="medium">中</option>
                    <option value="low">低</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">重大度</label>
                  <select className="input" value={incidentEditForm.severity ?? "minor"}
                    onChange={(e) => setIncidentEditForm({ ...incidentEditForm, severity: e.target.value })}>
                    <option value="critical">重大</option>
                    <option value="major">中度</option>
                    <option value="minor">軽微</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ステータス</label>
                  <select className="input" value={incidentEditForm.status ?? "open"}
                    onChange={(e) => setIncidentEditForm({ ...incidentEditForm, status: e.target.value })}>
                    <option value="open">オープン</option>
                    <option value="in_progress">対応中</option>
                    <option value="resolved">解決済</option>
                    <option value="closed">クローズ</option>
                  </select>
                </div>
              </div>
              {updateIncidentMutation.isError && (
                <p className="text-red-600 text-sm">更新に失敗しました。</p>
              )}
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" className="btn-secondary" onClick={() => setEditingIncident(null)}>
                  キャンセル
                </button>
                <button type="submit" className="btn-primary" disabled={updateIncidentMutation.isPending}>
                  {updateIncidentMutation.isPending ? "更新中..." : "更新"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 変更要求編集モーダル */}
      {editingChange && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-lg font-semibold">変更要求編集</h3>
              <button onClick={() => setEditingChange(null)}>
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); updateChangeMutation.mutate({ id: editingChange.id, data: changeEditForm }); }} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">タイトル</label>
                <input type="text" className="input" value={changeEditForm.title ?? ""}
                  onChange={(e) => setChangeEditForm({ ...changeEditForm, title: e.target.value })} required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">説明</label>
                <textarea className="input" rows={3} value={changeEditForm.description ?? ""}
                  onChange={(e) => setChangeEditForm({ ...changeEditForm, description: e.target.value })} required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">変更タイプ</label>
                  <select className="input" value={changeEditForm.change_type ?? "normal"}
                    onChange={(e) => setChangeEditForm({ ...changeEditForm, change_type: e.target.value })}>
                    <option value="normal">標準</option>
                    <option value="emergency">緊急</option>
                    <option value="standard">定型</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">リスク</label>
                  <select className="input" value={changeEditForm.risk_level ?? "medium"}
                    onChange={(e) => setChangeEditForm({ ...changeEditForm, risk_level: e.target.value })}>
                    <option value="high">高</option>
                    <option value="medium">中</option>
                    <option value="low">低</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ステータス</label>
                  <select className="input" value={changeEditForm.status ?? "pending"}
                    onChange={(e) => setChangeEditForm({ ...changeEditForm, status: e.target.value })}>
                    <option value="pending">保留中</option>
                    <option value="approved">承認済</option>
                    <option value="rejected">却下</option>
                    <option value="implemented">実施済</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">影響範囲</label>
                <textarea className="input" rows={2} value={changeEditForm.impact ?? ""}
                  onChange={(e) => setChangeEditForm({ ...changeEditForm, impact: e.target.value })} />
              </div>
              {updateChangeMutation.isError && (
                <p className="text-red-600 text-sm">更新に失敗しました。</p>
              )}
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" className="btn-secondary" onClick={() => setEditingChange(null)}>
                  キャンセル
                </button>
                <button type="submit" className="btn-primary" disabled={updateChangeMutation.isPending}>
                  {updateChangeMutation.isPending ? "更新中..." : "更新"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
