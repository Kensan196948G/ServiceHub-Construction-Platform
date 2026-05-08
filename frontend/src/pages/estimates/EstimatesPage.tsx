import { Receipt, TrendingUp, Clock, AlertCircle, Plus, ChevronRight } from "lucide-react";
import { Card, Badge } from "@/components/ui";

type QuoteStatus = "draft" | "sent" | "approved" | "rejected";
type InvoiceStatus = "unpaid" | "overdue" | "paid";

type Quote = {
  id: string;
  project: string;
  client: string;
  amount: number;
  status: QuoteStatus;
  submittedAt: string;
};

type Invoice = {
  id: string;
  project: string;
  amount: number;
  dueDate: string;
  status: InvoiceStatus;
  daysOverdue?: number;
};

const QUOTES: Quote[] = [
  { id: "EST-2026-0041", project: "渋谷オフィスビル新築工事 — 追加変更",  client: "渋谷商事株式会社", amount: 18_500_000, status: "sent",     submittedAt: "2026-04-25" },
  { id: "EST-2026-0040", project: "横浜マンション改修工事 — 外壁追加",     client: "横浜住宅開発",   amount: 4_200_000,  status: "approved", submittedAt: "2026-04-18" },
  { id: "EST-2026-0039", project: "川崎倉庫増築工事 — 設備増強",          client: "川崎物流株式会社", amount: 7_800_000,  status: "draft",    submittedAt: "2026-04-30" },
  { id: "EST-2026-0038", project: "大宮工場改修工事",                      client: "大宮製造株式会社", amount: 12_300_000, status: "rejected", submittedAt: "2026-04-10" },
];

const INVOICES: Invoice[] = [
  { id: "INV-2026-0112", project: "横浜マンション改修工事 3期",  amount: 8_400_000,  dueDate: "2026-05-15", status: "unpaid" },
  { id: "INV-2026-0108", project: "渋谷オフィスビル 2期",        amount: 22_000_000, dueDate: "2026-04-28", status: "overdue", daysOverdue: 4 },
  { id: "INV-2026-0101", project: "川崎倉庫増築 1期",            amount: 5_500_000,  dueDate: "2026-04-20", status: "overdue", daysOverdue: 12 },
  { id: "INV-2026-0099", project: "渋谷オフィスビル 1期",        amount: 20_000_000, dueDate: "2026-03-31", status: "paid" },
  { id: "INV-2026-0094", project: "横浜マンション 2期",          amount: 7_600_000,  dueDate: "2026-03-15", status: "paid" },
];

const QUOTE_STATUS: Record<QuoteStatus, { label: string; variant: "info" | "warning" | "success" | "danger" }> = {
  draft:    { label: "下書き",   variant: "info" },
  sent:     { label: "提出済",   variant: "warning" },
  approved: { label: "承認済",   variant: "success" },
  rejected: { label: "否認",     variant: "danger" },
};

const INVOICE_STATUS: Record<InvoiceStatus, { label: string; variant: "warning" | "danger" | "success" }> = {
  unpaid:  { label: "未回収",   variant: "warning" },
  overdue: { label: "期限超過", variant: "danger" },
  paid:    { label: "回収済",   variant: "success" },
};

const fmt = (n: number) =>
  "¥" + (n / 10000).toLocaleString("ja-JP", { maximumFractionDigits: 0 }) + "万";

const overdueTotal = INVOICES.filter((i) => i.status === "overdue").reduce((s, i) => s + i.amount, 0);
const unpaidTotal = INVOICES.filter((i) => i.status !== "paid").reduce((s, i) => s + i.amount, 0);

export default function EstimatesPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">
            見積・請求
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            見積パイプライン · 請求・入金管理 · 期限超過ハイライト
          </p>
        </div>
        <div className="flex gap-3">
          <button className="inline-flex items-center gap-2 h-10 px-4 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors">
            <Receipt className="w-4 h-4" />請求書発行
          </button>
          <button className="inline-flex items-center gap-2 h-10 px-4 bg-[var(--brand-60)] text-white text-sm font-medium rounded-lg hover:bg-[var(--brand-70)] transition-colors">
            <Plus className="w-4 h-4" />新規見積
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        {[
          {
            label: "見積提出中", value: `${QUOTES.filter((q) => q.status === "sent").length}件`,
            icon: TrendingUp, bg: "bg-[var(--brand-10)]", fg: "text-[var(--brand-60)]",
          },
          {
            label: "未回収 総額", value: fmt(unpaidTotal),
            icon: Clock, bg: "bg-[var(--warn-10)]", fg: "text-[var(--warn-60)]",
          },
          {
            label: "期限超過", value: fmt(overdueTotal),
            icon: AlertCircle, bg: "bg-[var(--err-10)]", fg: "text-[var(--err-60)]",
          },
          {
            label: "今月 入金", value: fmt(INVOICES.filter((i) => i.status === "paid").reduce((s, i) => s + i.amount, 0)),
            icon: Receipt, bg: "bg-[var(--ok-10)]", fg: "text-[var(--ok-60)]",
          },
        ].map((s, i) => (
          <Card key={i} className="flex items-center gap-4 p-5">
            <div className={`w-11 h-11 rounded-lg ${s.bg} flex items-center justify-center flex-shrink-0`}>
              <s.icon className={`w-5 h-5 ${s.fg}`} />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">{s.label}</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 tabular-nums">{s.value}</p>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quote pipeline */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">見積パイプライン</h2>
            <span className="text-sm text-gray-400">{QUOTES.length}件</span>
          </div>
          <div className="space-y-3">
            {QUOTES.map((q) => (
              <div
                key={q.id}
                className="p-4 border border-gray-100 dark:border-gray-700 rounded-lg hover:border-[var(--brand-30,#93b9e8)] hover:bg-[var(--brand-10)] dark:hover:bg-[var(--brand-90)]/10 transition-all cursor-pointer"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <p className="font-mono text-xs text-[var(--brand-60)]">{q.id}</p>
                  <Badge variant={QUOTE_STATUS[q.status].variant} size="sm">
                    {QUOTE_STATUS[q.status].label}
                  </Badge>
                </div>
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1 leading-snug">
                  {q.project}
                </p>
                <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                  <span>{q.client}</span>
                  <span className="font-bold tabular-nums text-gray-700 dark:text-gray-300">{fmt(q.amount)}</span>
                </div>
                <p className="text-xs text-gray-400 mt-1">提出: {q.submittedAt}</p>
              </div>
            ))}
          </div>
        </Card>

        {/* Invoices */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">請求・入金状況</h2>
            <button className="text-sm text-[var(--brand-60)] font-medium inline-flex items-center gap-1 hover:underline">
              すべて <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="space-y-3">
            {INVOICES.map((inv) => (
              <div
                key={inv.id}
                className={`p-4 border rounded-lg transition-all cursor-pointer ${
                  inv.status === "overdue"
                    ? "border-[var(--err-20)] bg-[var(--err-10)] dark:bg-red-900/10 hover:border-[var(--err-60)]"
                    : inv.status === "paid"
                    ? "border-gray-100 dark:border-gray-700 opacity-60 hover:opacity-80"
                    : "border-gray-100 dark:border-gray-700 hover:border-[var(--brand-30,#93b9e8)] hover:bg-[var(--brand-10)]"
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-1">
                  <p className="font-mono text-xs text-gray-500 dark:text-gray-400">{inv.id}</p>
                  <div className="flex items-center gap-2">
                    {inv.daysOverdue && (
                      <span className="text-xs font-bold text-[var(--err-60)]">+{inv.daysOverdue}日</span>
                    )}
                    <Badge variant={INVOICE_STATUS[inv.status].variant} size="sm">
                      {INVOICE_STATUS[inv.status].label}
                    </Badge>
                  </div>
                </div>
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{inv.project}</p>
                <div className="flex items-center justify-between mt-1 text-xs text-gray-500 dark:text-gray-400">
                  <span>期日: {inv.dueDate}</span>
                  <span className="font-bold tabular-nums text-gray-700 dark:text-gray-300">{fmt(inv.amount)}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
