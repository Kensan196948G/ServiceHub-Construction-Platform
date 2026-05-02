import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Building2,
  FileText,
  HardHat,
  AlertCircle,
  TrendingUp,
  PlusCircle,
  Mic,
  ShieldCheck,
  Camera,
  Map,
} from "lucide-react";
import { Link } from "react-router-dom";
import { projectsApi } from "@/api/projects";
import { itsmApi } from "@/api/itsm";
import { useAuthStore } from "@/stores/authStore";
import { Badge, Button, Card, ErrorBanner, Skeleton, StatCard } from "@/components/ui";
import { useDashboardKPI } from "@/api/dashboard";

const PRIORITY_COLORS: Record<string, string> = {
  CRITICAL: "bg-red-600 text-white",
  HIGH: "bg-orange-500 text-white",
  MEDIUM: "bg-yellow-500 text-white",
  LOW: "bg-gray-200 text-gray-700",
};

const PRIORITY_LABELS: Record<string, string> = {
  CRITICAL: "致命的",
  HIGH: "高",
  MEDIUM: "中",
  LOW: "低",
};

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 5) return "お疲れ様です";
  if (h < 11) return "おはようございます";
  if (h < 17) return "こんにちは";
  return "お疲れ様です";
}

// ── StatusBadge ───────────────────────────────────────────────────────────────
const STATUS_VARIANT: Record<string, "info" | "success" | "warning" | "danger"> = {
  PLANNING: "info",
  IN_PROGRESS: "success",
  ON_HOLD: "warning",
  COMPLETED: "info",
  CANCELLED: "danger",
};
const STATUS_LABELS: Record<string, string> = {
  PLANNING: "計画中",
  IN_PROGRESS: "進行中",
  ON_HOLD: "保留",
  COMPLETED: "完了",
  CANCELLED: "中止",
};
function StatusBadge({ status }: { status: string }) {
  return (
    <Badge variant={STATUS_VARIANT[status] ?? "info"} size="sm">
      {STATUS_LABELS[status] ?? status}
    </Badge>
  );
}

// ── IncidentStatusBadge ───────────────────────────────────────────────────────
const INCIDENT_STATUS_VARIANT: Record<string, "danger" | "warning" | "success" | "info"> = {
  OPEN: "danger",
  IN_PROGRESS: "warning",
  RESOLVED: "success",
  CLOSED: "info",
};
const INCIDENT_STATUS_LABELS: Record<string, string> = {
  OPEN: "未対応",
  IN_PROGRESS: "対応中",
  RESOLVED: "解決済",
  CLOSED: "クローズ",
};
function IncidentStatusBadge({ status }: { status: string }) {
  return (
    <Badge variant={INCIDENT_STATUS_VARIANT[status] ?? "info"} size="sm">
      {INCIDENT_STATUS_LABELS[status] ?? status}
    </Badge>
  );
}

// ── CostChart — SVG line+area (原価予実対比) ─────────────────────────────────
function CostChart() {
  const months = ["11月", "12月", "1月", "2月", "3月", "4月"];
  const planned = [10, 24, 38, 55, 68, 78];
  const actual  = [9,  22, 35, 50, 62, 71];
  const W = 600, H = 220;
  const PAD = { t: 20, r: 20, b: 36, l: 44 };
  const plotW = W - PAD.l - PAD.r;
  const plotH = H - PAD.t - PAD.b;
  const maxV = 100;
  const xAt = (i: number) => PAD.l + (i / (months.length - 1)) * plotW;
  const yAt = (v: number) => PAD.t + (1 - v / maxV) * plotH;

  const areaPath =
    `M ${xAt(0)} ${yAt(0)} ` +
    actual.map((v, i) => `L ${xAt(i)} ${yAt(v)}`).join(" ") +
    ` L ${xAt(actual.length - 1)} ${yAt(0)} Z`;
  const actualLine = "M " + actual.map((v, i) => `${xAt(i)} ${yAt(v)}`).join(" L ");
  const plannedLine = "M " + planned.map((v, i) => `${xAt(i)} ${yAt(v)}`).join(" L ");

  return (
    <Card className="p-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 m-0">
            原価予実対比 — 全案件累計
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">過去6ヶ月 · 予算達成率 91.0%</p>
        </div>
        <div className="flex gap-4 text-sm">
          <span className="inline-flex items-center gap-1.5 text-gray-600 dark:text-gray-400">
            <span className="inline-block w-3 h-0.5 bg-gray-400" />計画
          </span>
          <span className="inline-flex items-center gap-1.5 text-gray-700 dark:text-gray-300">
            <span className="inline-block w-3 h-0.5 bg-[var(--brand-60,#2458a6)]" style={{ height: 3 }} />実績
          </span>
        </div>
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        style={{ display: "block", maxHeight: 240 }}
        role="img"
        aria-label="原価予実対比チャート"
      >
        {[0, 25, 50, 75, 100].map((v) => (
          <g key={v}>
            <line
              x1={PAD.l} x2={W - PAD.r}
              y1={yAt(v)} y2={yAt(v)}
              stroke="#e0e0e0" strokeWidth="1"
            />
            <text
              x={PAD.l - 8} y={yAt(v) + 4}
              fill="#6f6f6f" fontSize="11"
              textAnchor="end" fontFamily="var(--font-mono,'IBM Plex Mono',monospace)"
            >{v}M</text>
          </g>
        ))}
        {months.map((m, i) => (
          <text
            key={m} x={xAt(i)} y={H - 12}
            fill="#525252" fontSize="12" textAnchor="middle"
          >{m}</text>
        ))}
        <path d={areaPath} fill="#2458a6" opacity="0.1" />
        <path d={plannedLine} fill="none" stroke="#8d8d8d" strokeWidth="2" strokeDasharray="4 4" />
        <path d={actualLine} fill="none" stroke="#2458a6" strokeWidth="2.5" />
        {actual.map((v, i) => (
          <circle
            key={i} cx={xAt(i)} cy={yAt(v)} r="4"
            fill="#fff" stroke="#2458a6" strokeWidth="2"
          />
        ))}
      </svg>
    </Card>
  );
}

// ── ProgressChart — horizontal bars (進捗率 主要案件) ──────────────────────────
function ProgressChart({ projects }: { projects: Array<{ id: string; name: string; status: string; progress_rate?: number | null }> }) {
  const items = projects.filter((p) => p.status !== "CANCELLED").slice(0, 4);

  const barColor = (status: string, pct: number) => {
    if (status === "ON_HOLD") return "#b76200";
    if (pct >= 100) return "#0f8b4a";
    return "#2458a6";
  };

  if (items.length === 0) {
    return (
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">進捗率 — 主要案件</h3>
        <p className="text-sm text-gray-400">案件データがありません</p>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 m-0">
          進捗率 — 主要案件
        </h3>
        <Link to="/projects" className="text-sm font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400">
          すべて →
        </Link>
      </div>
      <div className="flex flex-col gap-3.5">
        {items.map((p) => {
          const pct = Math.round((p.progress_rate ?? 0) * 100);
          return (
            <div key={p.id}>
              <div className="flex justify-between text-sm mb-1.5">
                <span
                  className="text-gray-900 dark:text-gray-100 font-medium truncate max-w-[70%]"
                  title={p.name}
                >{p.name}</span>
                <span className="text-gray-600 dark:text-gray-400 font-semibold tabular-nums">{pct}%</span>
              </div>
              <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${pct}%`, background: barColor(p.status, pct) }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

// ── QuickActionCard — field-worker actions ────────────────────────────────────
type QAProps = {
  to: string;
  icon: React.ElementType;
  label: string;
  iconBg: string;
  iconFg: string;
  hoverBg: string;
  hoverBorder: string;
};

function QuickActionCard({ to, icon: Icon, label, iconBg, iconFg, hoverBg, hoverBorder }: QAProps) {
  return (
    <Link to={to} className="block group">
      <div
        className="flex flex-col items-center gap-2.5 py-5 px-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg min-h-[100px] cursor-pointer transition-all"
        style={{
          ["--hover-bg" as string]: hoverBg,
          ["--hover-border" as string]: hoverBorder,
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLElement).style.borderColor = hoverBorder;
          (e.currentTarget as HTMLElement).style.background = hoverBg;
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.borderColor = "";
          (e.currentTarget as HTMLElement).style.background = "";
        }}
      >
        <div
          className="w-12 h-12 rounded-md flex items-center justify-center"
          style={{ background: iconBg, color: iconFg }}
        >
          <Icon size={22} />
        </div>
        <span className="text-sm font-medium text-gray-800 dark:text-gray-200 text-center leading-tight">
          {label}
        </span>
      </div>
    </Link>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { user } = useAuthStore();
  const greeting = useMemo(() => getGreeting(), []);
  const displayName = user?.full_name?.split(" ")[0] ?? user?.full_name ?? "ユーザー";

  const { data: kpi, isLoading: kpiLoading, isError: kpiError, refetch: refetchKpi } = useDashboardKPI();

  const { data: recentProjects, isLoading: loadingRecent } = useQuery({
    queryKey: ["dashboard-projects-recent"],
    queryFn: () => projectsApi.list(1, 5),
  });

  const { data: recentIncidents, isLoading: loadingIncidents } = useQuery({
    queryKey: ["dashboard-incidents-recent"],
    queryFn: () => itsmApi.listIncidents(1, 3),
  });

  const today = new Date().toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
  });

  const quickActions: QAProps[] = [
    {
      to: "/photos",
      icon: Camera,
      label: "電子小黒板で撮影",
      iconBg: "var(--safety-10,#fff1e8)",
      iconFg: "var(--safety-60,#d64a1a)",
      hoverBg: "var(--safety-10,#fff1e8)",
      hoverBorder: "var(--safety-60,#d64a1a)",
    },
    {
      to: "/reports",
      icon: Mic,
      label: "音声で日報作成",
      iconBg: "var(--brand-10,#eaf2fb)",
      iconFg: "var(--brand-60,#2458a6)",
      hoverBg: "var(--brand-10,#eaf2fb)",
      hoverBorder: "var(--brand-60,#2458a6)",
    },
    {
      to: "/safety",
      icon: ShieldCheck,
      label: "KY活動 記録",
      iconBg: "var(--ok-10,#e6f7ee)",
      iconFg: "var(--ok-60,#0f8b4a)",
      hoverBg: "var(--ok-10,#e6f7ee)",
      hoverBorder: "var(--ok-60,#0f8b4a)",
    },
    {
      to: "/safety",
      icon: AlertCircle,
      label: "ヒヤリハット報告",
      iconBg: "var(--warn-10,#fff4e0)",
      iconFg: "var(--warn-60,#b76200)",
      hoverBg: "var(--warn-10,#fff4e0)",
      hoverBorder: "var(--warn-60,#b76200)",
    },
    {
      to: "/projects",
      icon: Map,
      label: "現場地図・工程表",
      iconBg: "var(--brand-10,#eaf2fb)",
      iconFg: "var(--brand-60,#2458a6)",
      hoverBg: "var(--brand-10,#eaf2fb)",
      hoverBorder: "var(--brand-60,#2458a6)",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">{today}</p>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">
            {greeting}、{displayName}さん
          </h2>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" size="sm" leftIcon={<FileText className="w-4 h-4" />}>
            帳票ダウンロード
          </Button>
          <Link to="/projects">
            <Button variant="primary" size="sm" leftIcon={<PlusCircle className="w-4 h-4" />}>
              新規案件を追加
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiLoading ? (
          <>
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </>
        ) : kpiError ? (
          <ErrorBanner className="col-span-full flex items-center justify-between">
            <span>KPI データの取得に失敗しました</span>
            <Button variant="ghost" size="sm" onClick={() => refetchKpi()}>
              再試行
            </Button>
          </ErrorBanner>
        ) : kpi ? (
          <>
            <Link to="/projects" className="block">
              <StatCard
                icon={<Building2 className="w-6 h-6" />}
                title="工事案件数 (合計)"
                value={kpi.projects.total}
                colorScheme="blue"
              />
            </Link>
            <Link to="/itsm" className="block">
              <StatCard
                icon={<AlertCircle className="w-6 h-6" />}
                title="進行中インシデント"
                value={kpi.incidents.open + kpi.incidents.in_progress}
                colorScheme="red"
              />
            </Link>
            <Link to="/cost" className="block">
              <StatCard
                icon={<TrendingUp className="w-6 h-6" />}
                title="コスト達成率"
                value={`${((1 + kpi.cost_overview.variance_rate) * 100).toFixed(1)}%`}
                colorScheme="green"
              />
            </Link>
            <Link to="/reports" className="block">
              <StatCard
                icon={<FileText className="w-6 h-6" />}
                title="本日の日報件数"
                value={kpi.daily_reports_count}
                colorScheme="purple"
              />
            </Link>
          </>
        ) : null}
      </div>

      {/* Charts row — 2fr/1fr */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <CostChart />
        </div>
        <div>
          <ProgressChart projects={recentProjects?.data ?? []} />
        </div>
      </div>

      {/* Bottom Grid: Recent Projects + Recent Incidents — 2fr/1fr */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Projects Table */}
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">最近の工事案件</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">更新順 · 5件表示</p>
            </div>
            <Link to="/projects" className="text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400 inline-flex items-center gap-1">
              すべて →
            </Link>
          </div>

          {loadingRecent ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : recentProjects && recentProjects.data.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-400 dark:text-gray-500 border-b border-gray-100 dark:border-gray-700">
                    <th className="pb-2 font-medium">案件名</th>
                    <th className="pb-2 font-medium hidden sm:table-cell">施主名</th>
                    <th className="pb-2 font-medium">ステータス</th>
                    <th className="pb-2 font-medium hidden md:table-cell">開始日</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                  {recentProjects.data.map((p) => (
                    <tr
                      key={p.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                    >
                      <td className="py-3 pr-2">
                        <Link
                          to={`/projects/${p.id}`}
                          className="font-medium text-gray-900 dark:text-gray-100 hover:text-primary-600 dark:hover:text-primary-400 block truncate max-w-[160px]"
                        >
                          {p.name}
                        </Link>
                        <span className="text-xs text-gray-400 dark:text-gray-500">{p.project_code}</span>
                      </td>
                      <td className="py-3 pr-2 hidden sm:table-cell text-gray-600 dark:text-gray-400 truncate max-w-[120px]">
                        {p.client_name}
                      </td>
                      <td className="py-3 pr-2">
                        <StatusBadge status={p.status} />
                      </td>
                      <td className="py-3 hidden md:table-cell text-gray-500 dark:text-gray-400 whitespace-nowrap">
                        {p.start_date
                          ? new Date(p.start_date).toLocaleDateString("ja-JP")
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400">
              <Building2 className="w-10 h-10 mx-auto mb-2" />
              <p className="text-sm">案件がありません</p>
            </div>
          )}
        </Card>

        {/* Recent Incidents */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">注意インシデント</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">未対応 · 優先度順</p>
            </div>
            <Link to="/itsm" className="text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400">
              すべて →
            </Link>
          </div>

          {loadingIncidents ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : recentIncidents && recentIncidents.data.length > 0 ? (
            <div className="space-y-3">
              {recentIncidents.data.map((inc) => (
                <Link
                  key={inc.id}
                  to="/itsm"
                  className="block p-3 rounded-lg border border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <span className="text-xs text-gray-400 dark:text-gray-500 font-mono shrink-0">
                      {inc.incident_number}
                    </span>
                    <span
                      className={`text-xs px-1.5 py-0.5 rounded font-medium shrink-0 ${
                        PRIORITY_COLORS[inc.priority] ?? "bg-gray-200 text-gray-700"
                      }`}
                    >
                      {PRIORITY_LABELS[inc.priority] ?? inc.priority}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-200 leading-snug line-clamp-2">
                    {inc.title}
                  </p>
                  <div className="flex items-center justify-between mt-2">
                    <IncidentStatusBadge status={inc.status} />
                    <span className="text-xs text-gray-400 dark:text-gray-500">
                      {new Date(inc.created_at).toLocaleDateString("ja-JP")}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400">
              <HardHat className="w-10 h-10 mx-auto mb-2" />
              <p className="text-sm">インシデントなし</p>
            </div>
          )}
        </Card>
      </div>

      {/* Quick Actions for field workers */}
      <Card className="p-6">
        <div className="flex items-baseline justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">現場クイックアクション</h3>
          <span className="text-sm text-gray-500 dark:text-gray-400">44px タッチターゲット · WCAG 2.2 準拠</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {quickActions.map((action) => (
            <QuickActionCard key={action.label} {...action} />
          ))}
        </div>
      </Card>
    </div>
  );
}
