import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, CheckCircle, XCircle, Trash2 } from "lucide-react";
import { Badge, Button, Card, Modal, FormField, Input, Select, Textarea, Skeleton } from "@/components/ui";
import { safetyApi, type SafetyCheck, type SafetyCheckCreate } from "@/api/safety";

export function SafetyTab({ projectId }: { projectId: string }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<SafetyCheckCreate>({ project_id: projectId, check_date: "", check_type: "DAILY", items_total: 0, items_ok: 0, items_ng: 0, overall_result: "PENDING" });
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
      setForm({ project_id: projectId, check_date: "", check_type: "DAILY", items_total: 0, items_ok: 0, items_ng: 0, overall_result: "PENDING" });
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
                onChange={(e) => setForm((f) => ({ ...f, check_type: e.target.value || "DAILY" }))}
              />
            </FormField>
            <FormField label="総項目数" htmlFor="safety-total">
              <Input
                id="safety-total"
                type="number"
                min={0}
                value={form.items_total ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, items_total: e.target.value ? Number(e.target.value) : 0 }))}
              />
            </FormField>
            <FormField label="OK項目数" htmlFor="safety-ok">
              <Input
                id="safety-ok"
                type="number"
                min={0}
                value={form.items_ok ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, items_ok: e.target.value ? Number(e.target.value) : 0 }))}
              />
            </FormField>
            <FormField label="NG項目数" htmlFor="safety-ng">
              <Input
                id="safety-ng"
                type="number"
                min={0}
                value={form.items_ng ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, items_ng: e.target.value ? Number(e.target.value) : 0 }))}
              />
            </FormField>
            <FormField label="総合判定" htmlFor="safety-result">
              <Select
                id="safety-result"
                value={form.overall_result ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, overall_result: e.target.value || "PENDING" }))}
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
