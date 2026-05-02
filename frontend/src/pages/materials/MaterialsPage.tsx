import { Package, AlertTriangle, TrendingDown, Plus, Search } from "lucide-react";
import { useState } from "react";
import { Card, Badge } from "@/components/ui";

type MaterialStatus = "normal" | "low" | "critical" | "overstock";

type Material = {
  sku: string;
  name: string;
  category: string;
  unit: string;
  stock: number;
  min: number;
  ordered: number;
  status: MaterialStatus;
  project: string;
};

const MATERIALS: Material[] = [
  { sku: "MT-0021", name: "普通ポルトランドセメント", category: "セメント・骨材", unit: "t",  stock: 12,  min: 20,  ordered: 30, status: "low",      project: "渋谷" },
  { sku: "MT-0034", name: "異形棒鋼 D13",             category: "鉄筋",           unit: "t",  stock: 4.5, min: 10,  ordered: 20, status: "critical",  project: "渋谷" },
  { sku: "MT-0052", name: "型枠合板 12mm",             category: "型枠",           unit: "枚", stock: 480, min: 200, ordered: 0,  status: "overstock", project: "川崎" },
  { sku: "MT-0067", name: "高力ボルト M22",            category: "鋼材・ボルト",   unit: "本", stock: 850, min: 500, ordered: 0,  status: "normal",    project: "渋谷" },
  { sku: "MT-0078", name: "砂利 20mm",                 category: "セメント・骨材", unit: "m³", stock: 35,  min: 30,  ordered: 0,  status: "normal",    project: "横浜" },
  { sku: "MT-0091", name: "ALC パネル",                category: "外壁材",         unit: "枚", stock: 60,  min: 80,  ordered: 40, status: "low",       project: "横浜" },
];

const STATUS_CONFIG: Record<MaterialStatus, { label: string; variant: "danger" | "warning" | "success" | "info" }> = {
  critical:  { label: "緊急",   variant: "danger" },
  low:       { label: "低在庫", variant: "warning" },
  normal:    { label: "正常",   variant: "success" },
  overstock: { label: "過剰",   variant: "info" },
};

const ORDERS = [
  { id: "PO-2026-0112", material: "普通ポルトランドセメント", qty: "30t",  eta: "2026-05-08", status: "配送中" },
  { id: "PO-2026-0113", material: "異形棒鋼 D13",             qty: "20t",  eta: "2026-05-12", status: "発注済" },
  { id: "PO-2026-0114", material: "ALC パネル",               qty: "40枚", eta: "2026-05-20", status: "確認待" },
];

export default function MaterialsPage() {
  const [q, setQ] = useState("");

  const filtered = MATERIALS.filter(
    (m) =>
      !q ||
      m.name.includes(q) ||
      m.sku.toLowerCase().includes(q.toLowerCase()) ||
      m.category.includes(q),
  );

  const criticalCount = MATERIALS.filter((m) => m.status === "critical").length;
  const lowCount = MATERIALS.filter((m) => m.status === "low").length;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">
            資材・在庫
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            SKU管理 · 発注・搬入 · 低在庫アラート
          </p>
        </div>
        <button className="inline-flex items-center gap-2 h-10 px-4 bg-[var(--brand-60)] text-white text-sm font-medium rounded-lg hover:bg-[var(--brand-70)] transition-colors">
          <Plus className="w-4 h-4" />発注申請
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="flex items-center gap-4 p-5">
          <div className="w-11 h-11 rounded-lg bg-[var(--err-10)] flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-5 h-5 text-[var(--err-60)]" />
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">緊急補充 SKU</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{criticalCount}</p>
          </div>
        </Card>
        <Card className="flex items-center gap-4 p-5">
          <div className="w-11 h-11 rounded-lg bg-[var(--warn-10)] flex items-center justify-center flex-shrink-0">
            <TrendingDown className="w-5 h-5 text-[var(--warn-60)]" />
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">低在庫 SKU</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{lowCount}</p>
          </div>
        </Card>
        <Card className="flex items-center gap-4 p-5">
          <div className="w-11 h-11 rounded-lg bg-[var(--brand-10)] flex items-center justify-center flex-shrink-0">
            <Package className="w-5 h-5 text-[var(--brand-60)]" />
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">発注中</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{ORDERS.length}</p>
          </div>
        </Card>
      </div>

      {/* Search + inventory table */}
      <Card>
        <div className="flex items-center gap-3 mb-5">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex-1">在庫一覧</h2>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="品名・SKU・分類で検索"
              className="pl-9 pr-4 h-9 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[var(--brand-60)] w-60"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead>
              <tr className="text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide border-b border-gray-100 dark:border-gray-700">
                <th className="pb-3 pr-4">SKU</th>
                <th className="pb-3 pr-4">品名</th>
                <th className="pb-3 pr-4 hidden md:table-cell">分類</th>
                <th className="pb-3 pr-4 text-right">在庫</th>
                <th className="pb-3 pr-4 text-right hidden sm:table-cell">発注中</th>
                <th className="pb-3 pr-4 hidden lg:table-cell">現場</th>
                <th className="pb-3">状態</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
              {filtered.map((m) => {
                const pct = Math.min((m.stock / m.min) * 100, 150);
                const barColor =
                  m.status === "critical" ? "bg-[var(--err-60)]"
                  : m.status === "low" ? "bg-[var(--warn-60)]"
                  : m.status === "overstock" ? "bg-[var(--brand-40,#3b7dd8)]"
                  : "bg-[var(--ok-60)]";

                return (
                  <tr key={m.sku} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <td className="py-3 pr-4 font-mono text-xs text-gray-500 dark:text-gray-400">{m.sku}</td>
                    <td className="py-3 pr-4 font-medium text-gray-900 dark:text-gray-100">
                      {m.name}
                      <div className="mt-1.5 h-1.5 w-24 bg-gray-100 dark:bg-gray-600 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${barColor}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                      </div>
                    </td>
                    <td className="py-3 pr-4 text-gray-500 dark:text-gray-400 hidden md:table-cell">{m.category}</td>
                    <td className="py-3 pr-4 text-right tabular-nums font-semibold text-gray-900 dark:text-gray-100">
                      {m.stock} <span className="text-xs text-gray-400 font-normal">{m.unit}</span>
                    </td>
                    <td className="py-3 pr-4 text-right tabular-nums text-gray-500 dark:text-gray-400 hidden sm:table-cell">
                      {m.ordered > 0 ? `${m.ordered} ${m.unit}` : "—"}
                    </td>
                    <td className="py-3 pr-4 text-gray-500 dark:text-gray-400 hidden lg:table-cell">{m.project}</td>
                    <td className="py-3">
                      <Badge variant={STATUS_CONFIG[m.status].variant} size="sm">
                        {STATUS_CONFIG[m.status].label}
                      </Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Incoming orders */}
      <Card>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">発注・搬入予定</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[480px]">
            <thead>
              <tr className="text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide border-b border-gray-100 dark:border-gray-700">
                <th className="pb-3 pr-4">発注番号</th>
                <th className="pb-3 pr-4">品名</th>
                <th className="pb-3 pr-4 text-right">数量</th>
                <th className="pb-3 pr-4">搬入予定</th>
                <th className="pb-3">状態</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
              {ORDERS.map((o) => (
                <tr key={o.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  <td className="py-3 pr-4 font-mono text-xs text-[var(--brand-60)]">{o.id}</td>
                  <td className="py-3 pr-4 font-medium text-gray-900 dark:text-gray-100">{o.material}</td>
                  <td className="py-3 pr-4 text-right tabular-nums text-gray-700 dark:text-gray-300">{o.qty}</td>
                  <td className="py-3 pr-4 text-gray-500 dark:text-gray-400">{o.eta}</td>
                  <td className="py-3">
                    <Badge
                      variant={o.status === "配送中" ? "success" : o.status === "発注済" ? "info" : "warning"}
                      size="sm"
                    >
                      {o.status}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
