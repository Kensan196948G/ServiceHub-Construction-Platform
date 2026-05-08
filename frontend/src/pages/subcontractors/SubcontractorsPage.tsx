import { Users2, Building2, Phone, CheckCircle2, Clock, AlertTriangle, Search } from "lucide-react";
import { useState } from "react";
import { Card, Badge } from "@/components/ui";

type CompanyStatus = "active" | "inactive";

type Company = {
  id: string;
  name: string;
  trade: string;
  contact: string;
  workers: number;
  todayCount: number;
  ccus: boolean;
  status: CompanyStatus;
};

const COMPANIES: Company[] = [
  { id: "SC-001", name: "田中鉄筋工業",     trade: "鉄筋",     contact: "田中 一郎", workers: 28, todayCount: 8,  ccus: true,  status: "active" },
  { id: "SC-002", name: "山本型枠工業",     trade: "型枠大工", contact: "山本 二郎", workers: 15, todayCount: 5,  ccus: true,  status: "active" },
  { id: "SC-003", name: "鈴木設備工業",     trade: "設備配管", contact: "鈴木 三郎", workers: 12, todayCount: 4,  ccus: false, status: "active" },
  { id: "SC-004", name: "東洋電気工事",     trade: "電気",     contact: "高橋 四郎", workers: 9,  todayCount: 3,  ccus: true,  status: "active" },
  { id: "SC-005", name: "みなと塗装",       trade: "塗装",     contact: "渡辺 五郎", workers: 7,  todayCount: 0,  ccus: false, status: "inactive" },
  { id: "SC-006", name: "関東左官工業",     trade: "左官",     contact: "伊藤 六郎", workers: 6,  todayCount: 2,  ccus: true,  status: "active" },
];

const TODAY_ASSIGNMENTS = [
  { site: "渋谷オフィスビル",   company: "田中鉄筋工業",  trade: "鉄筋",    count: 8,  lead: "田中 一郎",  time: "07:30" },
  { site: "渋谷オフィスビル",   company: "山本型枠工業",  trade: "型枠大工", count: 5,  lead: "山本 二郎",  time: "08:00" },
  { site: "横浜マンション改修", company: "鈴木設備工業",  trade: "設備配管", count: 4,  lead: "鈴木 三郎",  time: "08:00" },
  { site: "川崎倉庫増築",       company: "東洋電気工事",  trade: "電気",    count: 3,  lead: "高橋 四郎",  time: "08:30" },
  { site: "横浜マンション改修", company: "関東左官工業",  trade: "左官",    count: 2,  lead: "伊藤 六郎",  time: "09:00" },
];

export default function SubcontractorsPage() {
  const [q, setQ] = useState("");

  const filtered = COMPANIES.filter(
    (c) =>
      !q ||
      c.name.includes(q) ||
      c.trade.includes(q) ||
      c.id.toLowerCase().includes(q.toLowerCase()),
  );

  const totalWorkers = TODAY_ASSIGNMENTS.reduce((s, a) => s + a.count, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">
            協力会社・職人
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            47社管理 · CCUS連携 · 本日の手配状況
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        {[
          { label: "登録協力会社", value: "47社", icon: Building2, bg: "bg-[var(--brand-10)]", fg: "text-[var(--brand-60)]" },
          { label: "本日稼働 職人", value: `${totalWorkers}名`, icon: Users2, bg: "bg-[var(--ok-10)]", fg: "text-[var(--ok-60)]" },
          { label: "CCUS 連携済", value: "31社", icon: CheckCircle2, bg: "bg-[var(--ok-10)]", fg: "text-[var(--ok-60)]" },
          { label: "CCUS 未連携", value: "16社", icon: AlertTriangle, bg: "bg-[var(--warn-10)]", fg: "text-[var(--warn-60)]" },
        ].map((s, i) => (
          <Card key={i} className="flex items-center gap-4 p-5">
            <div className={`w-11 h-11 rounded-lg ${s.bg} flex items-center justify-center flex-shrink-0`}>
              <s.icon className={`w-5 h-5 ${s.fg}`} />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">{s.label}</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{s.value}</p>
            </div>
          </Card>
        ))}
      </div>

      {/* Today's assignments */}
      <Card>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">本日の手配 ({new Date().toLocaleDateString("ja-JP")})</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[540px]">
            <thead>
              <tr className="text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide border-b border-gray-100 dark:border-gray-700">
                <th className="pb-3 pr-4">現場</th>
                <th className="pb-3 pr-4">会社名</th>
                <th className="pb-3 pr-4 hidden sm:table-cell">職種</th>
                <th className="pb-3 pr-4 text-right">人数</th>
                <th className="pb-3 pr-4 hidden md:table-cell">責任者</th>
                <th className="pb-3">集合</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
              {TODAY_ASSIGNMENTS.map((a, i) => (
                <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  <td className="py-3 pr-4 font-medium text-gray-900 dark:text-gray-100 max-w-[140px] truncate">{a.site}</td>
                  <td className="py-3 pr-4 text-gray-700 dark:text-gray-300">{a.company}</td>
                  <td className="py-3 pr-4 text-gray-500 dark:text-gray-400 hidden sm:table-cell">{a.trade}</td>
                  <td className="py-3 pr-4 text-right font-semibold tabular-nums text-gray-900 dark:text-gray-100">{a.count}名</td>
                  <td className="py-3 pr-4 text-gray-500 dark:text-gray-400 hidden md:table-cell">{a.lead}</td>
                  <td className="py-3 font-mono text-sm text-[var(--brand-60)] font-semibold">{a.time}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-gray-200 dark:border-gray-600">
                <td colSpan={3} className="pt-3 pr-4 text-sm font-semibold text-gray-700 dark:text-gray-300 hidden sm:table-cell">合計</td>
                <td colSpan={3} className="pt-3 text-right sm:text-right font-bold text-gray-900 dark:text-gray-100">{totalWorkers}名</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>

      {/* Company list */}
      <Card>
        <div className="flex items-center gap-3 mb-5">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex-1">協力会社一覧</h2>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="会社名・職種で検索"
              className="pl-9 pr-4 h-9 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[var(--brand-60)] w-52"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[540px]">
            <thead>
              <tr className="text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide border-b border-gray-100 dark:border-gray-700">
                <th className="pb-3 pr-4">ID</th>
                <th className="pb-3 pr-4">会社名</th>
                <th className="pb-3 pr-4">職種</th>
                <th className="pb-3 pr-4 text-right hidden sm:table-cell">登録職人</th>
                <th className="pb-3 pr-4 text-right hidden sm:table-cell">本日</th>
                <th className="pb-3 pr-4 hidden md:table-cell">担当</th>
                <th className="pb-3 pr-4">CCUS</th>
                <th className="pb-3">状態</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
              {filtered.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  <td className="py-3 pr-4 font-mono text-xs text-gray-400">{c.id}</td>
                  <td className="py-3 pr-4 font-medium text-gray-900 dark:text-gray-100">{c.name}</td>
                  <td className="py-3 pr-4 text-gray-600 dark:text-gray-400">{c.trade}</td>
                  <td className="py-3 pr-4 text-right tabular-nums text-gray-700 dark:text-gray-300 hidden sm:table-cell">{c.workers}名</td>
                  <td className="py-3 pr-4 text-right tabular-nums font-semibold text-gray-900 dark:text-gray-100 hidden sm:table-cell">
                    {c.todayCount > 0 ? `${c.todayCount}名` : "—"}
                  </td>
                  <td className="py-3 pr-4 text-gray-500 dark:text-gray-400 hidden md:table-cell">
                    <span className="flex items-center gap-1.5">
                      <Phone className="w-3 h-3" />{c.contact}
                    </span>
                  </td>
                  <td className="py-3 pr-4">
                    {c.ccus ? (
                      <CheckCircle2 className="w-4 h-4 text-[var(--ok-60)]" aria-label="CCUS連携済" />
                    ) : (
                      <Clock className="w-4 h-4 text-[var(--warn-60)]" aria-label="CCUS未連携" />
                    )}
                  </td>
                  <td className="py-3">
                    <Badge variant={c.status === "active" ? "success" : "info"} size="sm">
                      {c.status === "active" ? "稼働中" : "休止"}
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
