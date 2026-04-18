import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { Badge, Button, Card, Modal, FormField, Input, Select, Skeleton } from "@/components/ui";
import { costApi, type CostRecord, type CostRecordCreate } from "@/api/cost";
import { COST_CATEGORY_LABELS } from "../constants";

export function CostTab({ projectId }: { projectId: string }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<CostRecordCreate>({
    project_id: projectId, record_date: "", category: "MATERIAL", description: "", budgeted_amount: 0, actual_amount: 0,
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
      setForm({ project_id: projectId, record_date: "", category: "MATERIAL", description: "", budgeted_amount: 0, actual_amount: 0 });
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
        <h4 className="font-semibold text-gray-900 dark:text-white">原価管理</h4>
        <Button variant="primary" size="sm" leftIcon={<Plus className="w-4 h-4" />} onClick={() => setOpen(true)}>
          新規作成
        </Button>
      </div>

      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "予算合計", value: `¥${Number(summary.total_budgeted).toLocaleString()}`, color: "text-gray-900 dark:text-white" },
            { label: "実績合計", value: `¥${Number(summary.total_actual).toLocaleString()}`, color: "text-gray-900 dark:text-white" },
            { label: "差異", value: `¥${Number(summary.variance).toLocaleString()}`, color: Number(summary.variance) >= 0 ? "text-green-600" : "text-red-600" },
            { label: "差異率", value: `${summary.variance_rate.toFixed(1)}%`, color: summary.variance_rate >= 0 ? "text-green-600" : "text-red-600" },
          ].map(({ label, value, color }) => (
            <Card key={label} className="text-center py-3">
              <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
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
          <p className="text-gray-500 dark:text-gray-400 mb-4">原価記録がまだありません</p>
          <Button variant="primary" size="sm" onClick={() => setOpen(true)}>追加する</Button>
        </Card>
      ) : (
        <Card padding="none">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-700">
                  <th className="text-left py-2 px-3 text-xs font-medium text-gray-500 dark:text-gray-400">日付</th>
                  <th className="text-left py-2 px-3 text-xs font-medium text-gray-500 dark:text-gray-400">カテゴリ</th>
                  <th className="text-left py-2 px-3 text-xs font-medium text-gray-500 dark:text-gray-400">内容</th>
                  <th className="text-right py-2 px-3 text-xs font-medium text-gray-500 dark:text-gray-400">予算</th>
                  <th className="text-right py-2 px-3 text-xs font-medium text-gray-500 dark:text-gray-400">実績</th>
                  <th className="text-right py-2 px-3 text-xs font-medium text-gray-500 dark:text-gray-400">差異</th>
                  <th className="py-2 px-3 text-xs font-medium text-gray-500 dark:text-gray-400"></th>
                </tr>
              </thead>
              <tbody>
                {records.map((r) => {
                  const diff = Number(r.budgeted_amount) - Number(r.actual_amount);
                  return (
                    <tr key={r.id} className="border-b border-gray-50 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="py-2 px-3 text-gray-600 dark:text-gray-300">{r.record_date}</td>
                      <td className="py-2 px-3">
                        <Badge variant="info" size="sm">
                          {COST_CATEGORY_LABELS[r.category] ?? r.category}
                        </Badge>
                      </td>
                      <td className="py-2 px-3 text-gray-800 dark:text-gray-200 max-w-xs truncate">{r.description}</td>
                      <td className="py-2 px-3 text-right text-gray-600 dark:text-gray-300">¥{Number(r.budgeted_amount).toLocaleString()}</td>
                      <td className="py-2 px-3 text-right text-gray-600 dark:text-gray-300">¥{Number(r.actual_amount).toLocaleString()}</td>
                      <td className={`py-2 px-3 text-right font-medium ${diff >= 0 ? "text-green-600" : "text-red-600"}`}>
                        {diff >= 0 ? "+" : ""}¥{diff.toLocaleString()}
                      </td>
                      <td className="py-2 px-3 text-center">
                        <button
                          className="p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-colors"
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
                onChange={(e) => setForm((f) => ({ ...f, budgeted_amount: e.target.value ? Number(e.target.value) : 0 }))}
              />
            </FormField>
            <FormField label="実績額 (円)" htmlFor="cost-actual">
              <Input
                id="cost-actual"
                type="number"
                min={0}
                value={form.actual_amount ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, actual_amount: e.target.value ? Number(e.target.value) : 0 }))}
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
