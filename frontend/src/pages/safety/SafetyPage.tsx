import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { HardHat, Plus, CheckCircle, FlaskConical, X, ChevronDown, ChevronUp } from "lucide-react";
import {
  safetyApi,
  SafetyCheckCreate,
  QualityInspectionCreate,
} from "@/api/safety";
import { projectsApi } from "@/api/projects";
import { Badge, Button, Card, ErrorText, Skeleton } from "@/components/ui";

type Tab = "checks" | "inspections";

const CHECK_TYPE_OPTIONS = [
  { value: "DAILY", label: "日次" },
  { value: "WEEKLY", label: "週次" },
  { value: "MONTHLY", label: "月次" },
] as const;

const CHECK_TYPE_LABEL: Record<string, string> = {
  DAILY: "日次",
  WEEKLY: "週次",
  MONTHLY: "月次",
};

type BadgeVariant = "success" | "danger" | "info";

const RESULT_VARIANT: Record<string, BadgeVariant> = {
  合格: "success",
  pass: "success",
  OK: "success",
  不合格: "danger",
  fail: "danger",
  NG: "danger",
};

export default function SafetyPage() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>("checks");
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [expandedCheckId, setExpandedCheckId] = useState<string | null>(null);

  const [checkForm, setCheckForm] = useState<SafetyCheckCreate>({
    project_id: "",
    check_date: new Date().toISOString().split("T")[0],
    check_type: "DAILY",
    items_total: 0,
    items_ok: 0,
    items_ng: 0,
    overall_result: "合格",
  });

  const [inspectionForm, setInspectionForm] = useState<QualityInspectionCreate>({
    project_id: "",
    inspection_date: new Date().toISOString().split("T")[0],
    inspection_type: "",
    target_item: "",
    result: "合格",
  });

  const { data: projectsData } = useQuery({
    queryKey: ["projects"],
    queryFn: () => projectsApi.list(),
  });
  const projects = projectsData?.data ?? [];

  const { data: checksData, isLoading: checksLoading } = useQuery({
    queryKey: ["safety-checks", selectedProjectId],
    queryFn: () => safetyApi.listSafetyChecks(selectedProjectId),
    enabled: !!selectedProjectId && tab === "checks",
  });

  const { data: inspectionsData, isLoading: inspectionsLoading } = useQuery({
    queryKey: ["quality-inspections", selectedProjectId],
    queryFn: () => safetyApi.listQualityInspections(selectedProjectId),
    enabled: !!selectedProjectId && tab === "inspections",
  });

  const checks = checksData?.data ?? [];
  const inspections = inspectionsData?.data ?? [];
  const isLoading = tab === "checks" ? checksLoading : inspectionsLoading;

  const createCheckMutation = useMutation({
    mutationFn: (data: SafetyCheckCreate) =>
      safetyApi.createSafetyCheck(data.project_id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["safety-checks", selectedProjectId] });
      setShowModal(false);
    },
  });

  const createInspectionMutation = useMutation({
    mutationFn: (data: QualityInspectionCreate) =>
      safetyApi.createQualityInspection(data.project_id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quality-inspections", selectedProjectId] });
      setShowModal(false);
    },
  });

  const deleteCheckMutation = useMutation({
    mutationFn: (checkId: string) =>
      safetyApi.deleteSafetyCheck(selectedProjectId, checkId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["safety-checks", selectedProjectId] });
    },
  });

  const deleteInspectionMutation = useMutation({
    mutationFn: (inspectionId: string) =>
      safetyApi.deleteQualityInspection(selectedProjectId, inspectionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quality-inspections", selectedProjectId] });
    },
  });

  function openModal() {
    if (tab === "checks") {
      setCheckForm({
        project_id: selectedProjectId,
        check_date: new Date().toISOString().split("T")[0],
        check_type: "DAILY",
        items_total: 0,
        items_ok: 0,
        items_ng: 0,
        overall_result: "合格",
      });
    } else {
      setInspectionForm({
        project_id: selectedProjectId,
        inspection_date: new Date().toISOString().split("T")[0],
        inspection_type: "",
        target_item: "",
        result: "合格",
      });
    }
    setShowModal(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (tab === "checks") {
      createCheckMutation.mutate(checkForm);
    } else {
      createInspectionMutation.mutate(inspectionForm);
    }
  }

  function handleDeleteCheck(checkId: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (window.confirm("この安全チェックを削除しますか？")) {
      deleteCheckMutation.mutate(checkId);
    }
  }

  function handleDeleteInspection(inspectionId: string) {
    if (window.confirm("この品質検査を削除しますか？")) {
      deleteInspectionMutation.mutate(inspectionId);
    }
  }

  const isPending = createCheckMutation.isPending || createInspectionMutation.isPending;
  const isError = createCheckMutation.isError || createInspectionMutation.isError;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <HardHat className="w-7 h-7 text-primary-600" />
          安全品質管理
        </h2>
        <Button
          leftIcon={<Plus className="w-4 h-4" />}
          onClick={openModal}
          disabled={!selectedProjectId}
        >
          新規作成
        </Button>
      </div>

      <Card>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">プロジェクト選択</label>
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
      </Card>

      <div className="flex gap-1 border-b border-gray-200 dark:border-gray-700">
        {(["checks", "inspections"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium flex items-center gap-1 border-b-2 transition-colors ${
              tab === t
                ? "border-primary-600 text-primary-600"
                : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
            }`}
          >
            {t === "checks" ? (
              <><CheckCircle className="w-4 h-4" />安全チェック</>
            ) : (
              <><FlaskConical className="w-4 h-4" />品質検査</>
            )}
          </button>
        ))}
      </div>

      {!selectedProjectId ? (
        <Card className="text-center py-16 text-gray-400">
          <HardHat className="w-12 h-12 mx-auto mb-3" />
          <p className="text-lg font-medium">プロジェクトを選択してください</p>
        </Card>
      ) : isLoading ? (
        <Card className="space-y-3">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
        </Card>
      ) : tab === "checks" ? (
        checks.length === 0 ? (
          <Card className="text-center py-16 text-gray-400">
            <CheckCircle className="w-12 h-12 mx-auto mb-3" />
            <p className="text-lg font-medium">安全チェックデータがありません</p>
          </Card>
        ) : (
          <Card padding="none" className="overflow-hidden">
            <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                <tr>
                  {["日付", "チェック種別", "OK数", "NG数", "総合判定", "", ""].map((h, i) => (
                    <th key={i} className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {checks.map((c) => {
                  const total = (c.items_total && c.items_total > 0) ? c.items_total : (c.items_ok + c.items_ng) || 1;
                  const okPct = Math.round((c.items_ok / total) * 100);
                  const isExpanded = expandedCheckId === c.id;
                  return (
                    <React.Fragment key={c.id}>
                      <tr
                        className="hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                        onClick={() => setExpandedCheckId(isExpanded ? null : c.id)}
                      >
                        <td className="px-4 py-3">{c.check_date}</td>
                        <td className="px-4 py-3">
                          <Badge variant="info" size="sm">
                            {CHECK_TYPE_LABEL[c.check_type] ?? c.check_type}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-green-700 font-medium">{c.items_ok}</td>
                        <td className="px-4 py-3 text-red-600 font-medium">{c.items_ng}</td>
                        <td className="px-4 py-3">
                          <Badge variant={RESULT_VARIANT[c.overall_result] ?? "info"} size="sm">
                            {c.overall_result}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <button
                            className="text-red-600 hover:text-red-800 text-sm"
                            onClick={(e) => handleDeleteCheck(c.id, e)}
                            disabled={deleteCheckMutation.isPending}
                          >
                            削除
                          </button>
                        </td>
                        <td className="px-4 py-3 text-gray-400">
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr className="bg-blue-50 dark:bg-blue-900/20">
                          <td colSpan={7} className="px-6 py-4">
                            <div className="space-y-3">
                              <div>
                                <div className="flex justify-between text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">
                                  <span className="text-green-700">OK: {c.items_ok}件</span>
                                  <span>合計: {total}件</span>
                                  <span className="text-red-600">NG: {c.items_ng}件</span>
                                </div>
                                <div className="w-full h-5 bg-red-200 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-green-500 rounded-full transition-all"
                                    style={{ width: `${okPct}%` }}
                                  />
                                </div>
                                <div className="flex justify-between text-xs text-gray-500 mt-1">
                                  <span className="text-green-600 font-medium">合格率: {okPct}%</span>
                                  <span className="text-red-500">NG率: {100 - okPct}%</span>
                                </div>
                              </div>
                              {c.notes && (
                                <p className="text-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 rounded p-2 border border-gray-200 dark:border-gray-600">
                                  <span className="font-medium">備考: </span>{c.notes}
                                </p>
                              )}
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
          </Card>
        )
      ) : inspections.length === 0 ? (
        <Card className="text-center py-16 text-gray-400">
          <FlaskConical className="w-12 h-12 mx-auto mb-3" />
          <p className="text-lg font-medium">品質検査データがありません</p>
        </Card>
      ) : (
        <Card padding="none" className="overflow-hidden">
          <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {["日付", "検査種別", "対象", "測定値", "結果", ""].map((h) => (
                  <th key={h} className="px-4 py-3 text-left font-medium text-gray-600">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {inspections.map((i) => (
                <tr key={i.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-4 py-3">{i.inspection_date}</td>
                  <td className="px-4 py-3">{i.inspection_type}</td>
                  <td className="px-4 py-3">{i.target_item}</td>
                  <td className="px-4 py-3">{i.measured_value ?? "—"}</td>
                  <td className="px-4 py-3">
                    <Badge variant={RESULT_VARIANT[i.result] ?? "info"} size="sm">
                      {i.result}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      className="text-red-600 hover:text-red-800 text-sm"
                      onClick={() => handleDeleteInspection(i.id)}
                      disabled={deleteInspectionMutation.isPending}
                    >
                      削除
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </Card>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b dark:border-gray-600 sticky top-0 bg-white dark:bg-gray-800">
              <h3 className="text-lg font-semibold dark:text-white">
                {tab === "checks" ? "安全チェック新規作成" : "品質検査新規作成"}
              </h3>
              <button onClick={() => setShowModal(false)}>
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {tab === "checks" ? (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">チェック日</label>
                    <input type="date" className="input" value={checkForm.check_date}
                      onChange={(e) => setCheckForm({ ...checkForm, check_date: e.target.value })} required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">チェック種別</label>
                    <select className="input" value={checkForm.check_type ?? "DAILY"}
                      onChange={(e) => setCheckForm({ ...checkForm, check_type: e.target.value })}>
                      {CHECK_TYPE_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">合計数</label>
                      <input type="number" className="input" min={0} value={checkForm.items_total ?? 0}
                        onChange={(e) => setCheckForm({ ...checkForm, items_total: Number(e.target.value) })} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">OK数</label>
                      <input type="number" className="input" min={0} value={checkForm.items_ok ?? 0}
                        onChange={(e) => setCheckForm({ ...checkForm, items_ok: Number(e.target.value) })} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">NG数</label>
                      <input type="number" className="input" min={0} value={checkForm.items_ng ?? 0}
                        onChange={(e) => setCheckForm({ ...checkForm, items_ng: Number(e.target.value) })} />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">総合判定</label>
                    <select className="input" value={checkForm.overall_result ?? "合格"}
                      onChange={(e) => setCheckForm({ ...checkForm, overall_result: e.target.value })}>
                      <option value="合格">合格 (OK)</option>
                      <option value="不合格">不合格 (NG)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">備考</label>
                    <textarea className="input" rows={2} value={checkForm.notes ?? ""}
                      onChange={(e) => setCheckForm({ ...checkForm, notes: e.target.value })} />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">検査日</label>
                    <input type="date" className="input" value={inspectionForm.inspection_date}
                      onChange={(e) => setInspectionForm({ ...inspectionForm, inspection_date: e.target.value })} required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">検査種別</label>
                    <input type="text" className="input" value={inspectionForm.inspection_type}
                      onChange={(e) => setInspectionForm({ ...inspectionForm, inspection_type: e.target.value })} required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">対象</label>
                    <input type="text" className="input" value={inspectionForm.target_item}
                      onChange={(e) => setInspectionForm({ ...inspectionForm, target_item: e.target.value })} required />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">基準値</label>
                      <input type="text" className="input" value={inspectionForm.standard_value ?? ""}
                        onChange={(e) => setInspectionForm({ ...inspectionForm, standard_value: e.target.value })} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">測定値</label>
                      <input type="text" className="input" value={inspectionForm.measured_value ?? ""}
                        onChange={(e) => setInspectionForm({ ...inspectionForm, measured_value: e.target.value })} />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">結果</label>
                    <select className="input" value={inspectionForm.result ?? "合格"}
                      onChange={(e) => setInspectionForm({ ...inspectionForm, result: e.target.value })}>
                      <option value="合格">合格</option>
                      <option value="不合格">不合格</option>
                    </select>
                  </div>
                </>
              )}
              {isError && <ErrorText message="作成に失敗しました。" />}
              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="secondary" onClick={() => setShowModal(false)}>
                  キャンセル
                </Button>
                <Button type="submit" loading={isPending}>
                  作成
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
