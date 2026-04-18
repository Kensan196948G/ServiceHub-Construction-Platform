import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, Plus, RefreshCw, Pencil } from "lucide-react";
import { Badge, Button, Card, ErrorText, Modal, FormField, Input, Select, Textarea, Skeleton } from "@/components/ui";
import { itsmApi, IncidentCreate, ChangeRequestCreate, Incident, ChangeRequest, IncidentUpdate, ChangeRequestUpdate } from "@/api/itsm";

type Tab = "incidents" | "changes";

type BadgeVariant = "danger" | "warning" | "info" | "success";

const PRIORITY_BADGE: Record<string, BadgeVariant> = {
  critical: "danger",
  high: "danger",
  medium: "warning",
  low: "info",
};
const PRIORITY_LABEL: Record<string, string> = {
  critical: "緊急",
  high: "高",
  medium: "中",
  low: "低",
};
const SEVERITY_BADGE: Record<string, BadgeVariant> = {
  critical: "danger",
  major: "warning",
  minor: "info",
};
const SEVERITY_LABEL: Record<string, string> = {
  critical: "重大",
  major: "中度",
  minor: "軽微",
};
const STATUS_BADGE: Record<string, BadgeVariant> = {
  open: "danger",
  in_progress: "warning",
  resolved: "success",
  closed: "info",
  pending: "warning",
  approved: "success",
  rejected: "danger",
  implemented: "success",
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
const RISK_BADGE: Record<string, BadgeVariant> = {
  high: "danger",
  medium: "warning",
  low: "info",
};
const RISK_LABEL: Record<string, string> = { high: "高", medium: "中", low: "低" };

const CATEGORY_OPTIONS = [
  { value: "infrastructure", label: "インフラ" },
  { value: "application", label: "アプリ" },
  { value: "security", label: "セキュリティ" },
  { value: "other", label: "その他" },
];

const PRIORITY_OPTIONS = [
  { value: "critical", label: "緊急" },
  { value: "high", label: "高" },
  { value: "medium", label: "中" },
  { value: "low", label: "低" },
];

const SEVERITY_OPTIONS = [
  { value: "critical", label: "重大" },
  { value: "major", label: "中度" },
  { value: "minor", label: "軽微" },
];

const CHANGE_TYPE_OPTIONS = [
  { value: "normal", label: "標準" },
  { value: "emergency", label: "緊急" },
  { value: "standard", label: "定型" },
];

const RISK_OPTIONS = [
  { value: "high", label: "高" },
  { value: "medium", label: "中" },
  { value: "low", label: "低" },
];

const INCIDENT_STATUS_OPTIONS = [
  { value: "open", label: "オープン" },
  { value: "in_progress", label: "対応中" },
  { value: "resolved", label: "解決済" },
  { value: "closed", label: "クローズ" },
];

const CHANGE_STATUS_OPTIONS = [
  { value: "pending", label: "保留中" },
  { value: "approved", label: "承認済" },
  { value: "rejected", label: "却下" },
  { value: "implemented", label: "実施済" },
];

export default function ItsmPage() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>("incidents");
  const [showModal, setShowModal] = useState(false);
  const [editingIncident, setEditingIncident] = useState<Incident | null>(null);
  const [editingChange, setEditingChange] = useState<ChangeRequest | null>(null);
  const [incidentEditForm, setIncidentEditForm] = useState<IncidentUpdate & { category?: string }>({});
  const [changeEditForm, setChangeEditForm] = useState<ChangeRequestUpdate & { change_type?: string }>({});

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
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <AlertCircle className="w-7 h-7 text-primary-600" />
          ITSM（インシデント・変更管理）
        </h2>
        <Button variant="primary" onClick={openModal} leftIcon={<Plus className="w-4 h-4" />}>
          新規作成
        </Button>
      </div>

      <div className="flex gap-1 border-b border-gray-200 dark:border-gray-700">
        {(["incidents", "changes"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium flex items-center gap-1 border-b-2 transition-colors ${
              tab === t
                ? "border-primary-600 text-primary-600"
                : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
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
        <Card>
          <div className="space-y-4 py-8">
            <Skeleton className="h-6 w-1/3 mx-auto" />
            <Skeleton className="h-4 w-1/2 mx-auto" />
            <Skeleton className="h-4 w-2/3 mx-auto" />
          </div>
        </Card>
      ) : tab === "incidents" ? (
        incidents.length === 0 ? (
          <Card className="text-center py-16 text-gray-400">
            <AlertCircle className="w-12 h-12 mx-auto mb-3" />
            <p className="text-lg font-medium">インシデントがありません</p>
          </Card>
        ) : (
          <Card padding="none" className="overflow-hidden">
            <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                <tr>
                  {["番号", "タイトル", "カテゴリ", "優先度", "重大度", "ステータス", "操作"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {incidents.map((inc) => (
                  <tr key={inc.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-4 py-3 font-mono text-xs">{inc.incident_number}</td>
                    <td className="px-4 py-3 font-medium max-w-xs truncate">{inc.title}</td>
                    <td className="px-4 py-3">{inc.category}</td>
                    <td className="px-4 py-3">
                      <Badge variant={PRIORITY_BADGE[inc.priority] ?? "info"} size="sm">
                        {PRIORITY_LABEL[inc.priority] ?? inc.priority}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={SEVERITY_BADGE[inc.severity] ?? "info"} size="sm">
                        {SEVERITY_LABEL[inc.severity] ?? inc.severity}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={STATUS_BADGE[inc.status] ?? "info"} size="sm">
                        {STATUS_LABEL[inc.status] ?? inc.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        leftIcon={<Pencil className="w-3 h-3" />}
                        onClick={() => openEditIncident(inc)}
                      >
                        詳細/編集
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </Card>
        )
      ) : changes.length === 0 ? (
        <Card className="text-center py-16 text-gray-400">
          <RefreshCw className="w-12 h-12 mx-auto mb-3" />
          <p className="text-lg font-medium">変更要求がありません</p>
        </Card>
      ) : (
        <Card padding="none" className="overflow-hidden">
          <div className="overflow-x-auto">
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
                <tr key={cr.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-4 py-3 font-mono text-xs">{cr.change_number}</td>
                  <td className="px-4 py-3 font-medium max-w-xs truncate">{cr.title}</td>
                  <td className="px-4 py-3">{cr.change_type}</td>
                  <td className="px-4 py-3">
                    <Badge variant={RISK_BADGE[cr.risk_level] ?? "info"} size="sm">
                      {RISK_LABEL[cr.risk_level] ?? cr.risk_level}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={STATUS_BADGE[cr.status] ?? "info"} size="sm">
                      {STATUS_LABEL[cr.status] ?? cr.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      leftIcon={<Pencil className="w-3 h-3" />}
                      onClick={() => openEditChange(cr)}
                    >
                      詳細/編集
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </Card>
      )}

      {/* 新規作成モーダル */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title={tab === "incidents" ? "インシデント新規作成" : "変更要求新規作成"} size="md">
        <form onSubmit={handleSubmit} className="space-y-4">
          {tab === "incidents" ? (
            <>
              <FormField label="タイトル" htmlFor="inc-title" required>
                <Input id="inc-title" value={incidentForm.title}
                  onChange={(e) => setIncidentForm({ ...incidentForm, title: e.target.value })} required />
              </FormField>
              <FormField label="説明" htmlFor="inc-desc" required>
                <Textarea id="inc-desc" rows={3} value={incidentForm.description}
                  onChange={(e) => setIncidentForm({ ...incidentForm, description: e.target.value })} required />
              </FormField>
              <div className="grid grid-cols-2 gap-4">
                <FormField label="カテゴリ" htmlFor="inc-category">
                  <Select id="inc-category" value={incidentForm.category ?? "infrastructure"}
                    onChange={(e) => setIncidentForm({ ...incidentForm, category: e.target.value })}
                    options={CATEGORY_OPTIONS} />
                </FormField>
                <FormField label="優先度" htmlFor="inc-priority">
                  <Select id="inc-priority" value={incidentForm.priority ?? "medium"}
                    onChange={(e) => setIncidentForm({ ...incidentForm, priority: e.target.value })}
                    options={PRIORITY_OPTIONS} />
                </FormField>
              </div>
              <FormField label="重大度" htmlFor="inc-severity">
                <Select id="inc-severity" value={incidentForm.severity ?? "minor"}
                  onChange={(e) => setIncidentForm({ ...incidentForm, severity: e.target.value })}
                  options={SEVERITY_OPTIONS} />
              </FormField>
            </>
          ) : (
            <>
              <FormField label="タイトル" htmlFor="cr-title" required>
                <Input id="cr-title" value={changeForm.title}
                  onChange={(e) => setChangeForm({ ...changeForm, title: e.target.value })} required />
              </FormField>
              <FormField label="説明" htmlFor="cr-desc" required>
                <Textarea id="cr-desc" rows={3} value={changeForm.description}
                  onChange={(e) => setChangeForm({ ...changeForm, description: e.target.value })} required />
              </FormField>
              <div className="grid grid-cols-2 gap-4">
                <FormField label="変更タイプ" htmlFor="cr-type">
                  <Select id="cr-type" value={changeForm.change_type ?? "normal"}
                    onChange={(e) => setChangeForm({ ...changeForm, change_type: e.target.value })}
                    options={CHANGE_TYPE_OPTIONS} />
                </FormField>
                <FormField label="リスク" htmlFor="cr-risk">
                  <Select id="cr-risk" value={changeForm.risk_level ?? "medium"}
                    onChange={(e) => setChangeForm({ ...changeForm, risk_level: e.target.value })}
                    options={RISK_OPTIONS} />
                </FormField>
              </div>
              <FormField label="影響範囲" htmlFor="cr-impact">
                <Textarea id="cr-impact" rows={2} value={changeForm.impact ?? ""}
                  onChange={(e) => setChangeForm({ ...changeForm, impact: e.target.value })} />
              </FormField>
            </>
          )}
          {isError && <ErrorText message="作成に失敗しました。" />}
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setShowModal(false)}>
              キャンセル
            </Button>
            <Button type="submit" variant="primary" loading={isPending}>
              {isPending ? "作成中..." : "作成"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* インシデント編集モーダル */}
      <Modal open={!!editingIncident} onClose={() => setEditingIncident(null)} title="インシデント編集" size="md">
        <form onSubmit={(e) => { e.preventDefault(); if (editingIncident) updateIncidentMutation.mutate({ id: editingIncident.id, data: incidentEditForm }); }} className="space-y-4">
          <FormField label="タイトル" htmlFor="edit-inc-title" required>
            <Input id="edit-inc-title" value={incidentEditForm.title ?? ""}
              onChange={(e) => setIncidentEditForm({ ...incidentEditForm, title: e.target.value })} required />
          </FormField>
          <FormField label="説明" htmlFor="edit-inc-desc" required>
            <Textarea id="edit-inc-desc" rows={3} value={incidentEditForm.description ?? ""}
              onChange={(e) => setIncidentEditForm({ ...incidentEditForm, description: e.target.value })} required />
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="カテゴリ" htmlFor="edit-inc-category">
              <Select id="edit-inc-category" value={incidentEditForm.category ?? "infrastructure"}
                onChange={(e) => setIncidentEditForm({ ...incidentEditForm, category: e.target.value })}
                options={CATEGORY_OPTIONS} />
            </FormField>
            <FormField label="優先度" htmlFor="edit-inc-priority">
              <Select id="edit-inc-priority" value={incidentEditForm.priority ?? "medium"}
                onChange={(e) => setIncidentEditForm({ ...incidentEditForm, priority: e.target.value })}
                options={PRIORITY_OPTIONS} />
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="重大度" htmlFor="edit-inc-severity">
              <Select id="edit-inc-severity" value={incidentEditForm.severity ?? "minor"}
                onChange={(e) => setIncidentEditForm({ ...incidentEditForm, severity: e.target.value })}
                options={SEVERITY_OPTIONS} />
            </FormField>
            <FormField label="ステータス" htmlFor="edit-inc-status">
              <Select id="edit-inc-status" value={incidentEditForm.status ?? "open"}
                onChange={(e) => setIncidentEditForm({ ...incidentEditForm, status: e.target.value })}
                options={INCIDENT_STATUS_OPTIONS} />
            </FormField>
          </div>
          {updateIncidentMutation.isError && (
            <ErrorText message="更新に失敗しました。" />
          )}
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setEditingIncident(null)}>
              キャンセル
            </Button>
            <Button type="submit" variant="primary" loading={updateIncidentMutation.isPending}>
              {updateIncidentMutation.isPending ? "更新中..." : "更新"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* 変更要求編集モーダル */}
      <Modal open={!!editingChange} onClose={() => setEditingChange(null)} title="変更要求編集" size="md">
        <form onSubmit={(e) => { e.preventDefault(); if (editingChange) updateChangeMutation.mutate({ id: editingChange.id, data: changeEditForm }); }} className="space-y-4">
          <FormField label="タイトル" htmlFor="edit-cr-title" required>
            <Input id="edit-cr-title" value={changeEditForm.title ?? ""}
              onChange={(e) => setChangeEditForm({ ...changeEditForm, title: e.target.value })} required />
          </FormField>
          <FormField label="説明" htmlFor="edit-cr-desc" required>
            <Textarea id="edit-cr-desc" rows={3} value={changeEditForm.description ?? ""}
              onChange={(e) => setChangeEditForm({ ...changeEditForm, description: e.target.value })} required />
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="変更タイプ" htmlFor="edit-cr-type">
              <Select id="edit-cr-type" value={changeEditForm.change_type ?? "normal"}
                onChange={(e) => setChangeEditForm({ ...changeEditForm, change_type: e.target.value })}
                options={CHANGE_TYPE_OPTIONS} />
            </FormField>
            <FormField label="リスク" htmlFor="edit-cr-risk">
              <Select id="edit-cr-risk" value={changeEditForm.risk_level ?? "medium"}
                onChange={(e) => setChangeEditForm({ ...changeEditForm, risk_level: e.target.value })}
                options={RISK_OPTIONS} />
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="ステータス" htmlFor="edit-cr-status">
              <Select id="edit-cr-status" value={changeEditForm.status ?? "pending"}
                onChange={(e) => setChangeEditForm({ ...changeEditForm, status: e.target.value })}
                options={CHANGE_STATUS_OPTIONS} />
            </FormField>
          </div>
          <FormField label="影響範囲" htmlFor="edit-cr-impact">
            <Textarea id="edit-cr-impact" rows={2} value={changeEditForm.impact ?? ""}
              onChange={(e) => setChangeEditForm({ ...changeEditForm, impact: e.target.value })} />
          </FormField>
          {updateChangeMutation.isError && (
            <ErrorText message="更新に失敗しました。" />
          )}
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setEditingChange(null)}>
              キャンセル
            </Button>
            <Button type="submit" variant="primary" loading={updateChangeMutation.isPending}>
              {updateChangeMutation.isPending ? "更新中..." : "更新"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
