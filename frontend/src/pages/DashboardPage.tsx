import { useQuery } from "@tanstack/react-query";
import {
  Building2,
  FileText,
  HardHat,
  AlertCircle,
  TrendingUp,
  PlusCircle,
  ClipboardList,
  ShieldCheck,
  Camera,
  Bug,
} from "lucide-react";
import { Link } from "react-router-dom";
import { projectsApi } from "@/api/projects";
import { itsmApi } from "@/api/itsm";
import { useAuthStore } from "@/stores/authStore";
import { Badge, Button, Card, Skeleton, StatCard } from "@/components/ui";
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

// ── QuickActionCard ───────────────────────────────────────────────────────────
function QuickActionCard({
  to,
  icon: Icon,
  label,
  color,
}: {
  to: string;
  icon: typeof PlusCircle;
  label: string;
  color: string;
}) {
  return (
    <Link
      to={to}
      className="block"
    >
    <Card className="flex flex-col items-center gap-3 py-5 hover:shadow-md hover:scale-[1.02] transition-all text-center">
      <div className={`p-3 rounded-full ${color}`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
      <span className="text-sm font-medium text-gray-700">{label}</span>
    </Card>
    </Link>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { user } = useAuthStore();

  // KPI data via shared hook
  const { data: kpi, isLoading: kpiLoading, isError: kpiError, refetch: refetchKpi } = useDashboardKPI();

  // 直近5件表示用
  const { data: recentProjects, isLoading: loadingRecent } = useQuery({
    queryKey: ["dashboard-projects-recent"],
    queryFn: () => projectsApi.list(1, 5),
  });

  // 直近3件インシデント
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            こんにちは、{user?.full_name ?? "ユーザー"}さん
          </h2>
          <p className="text-gray-500 text-sm mt-1">ServiceHub 工事管理プラットフォーム</p>
        </div>
        <p className="text-sm text-gray-400 mt-1 hidden sm:block">{today}</p>
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
          <div className="col-span-full rounded-lg bg-red-50 border border-red-200 p-4 flex items-center justify-between">
            <p className="text-sm text-red-700">KPI データの取得に失敗しました</p>
            <Button variant="ghost" size="sm" onClick={() => refetchKpi()}>
              再試行
            </Button>
          </div>
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

      {/* Quick Actions */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-3">クイックアクション</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <QuickActionCard to="/projects" icon={PlusCircle} label="新規案件作成" color="bg-blue-500" />
          <QuickActionCard to="/reports" icon={ClipboardList} label="日報入力" color="bg-purple-500" />
          <QuickActionCard to="/safety" icon={ShieldCheck} label="安全チェック" color="bg-green-600" />
          <QuickActionCard to="/photos" icon={Camera} label="写真アップロード" color="bg-orange-500" />
          <QuickActionCard to="/itsm" icon={Bug} label="インシデント登録" color="bg-red-500" />
        </div>
      </div>

      {/* Bottom Grid: Recent Projects + Recent Incidents */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Projects Table */}
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">最近の工事案件</h3>
            <Link to="/projects" className="text-sm text-primary-600 hover:text-primary-700">
              すべて表示 →
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
                  <tr className="text-left text-xs text-gray-400 border-b border-gray-100">
                    <th className="pb-2 font-medium">案件名</th>
                    <th className="pb-2 font-medium hidden sm:table-cell">施主名</th>
                    <th className="pb-2 font-medium">ステータス</th>
                    <th className="pb-2 font-medium hidden md:table-cell">開始日</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {recentProjects.data.map((p) => (
                    <tr
                      key={p.id}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="py-3 pr-2">
                        <Link
                          to={`/projects/${p.id}`}
                          className="font-medium text-gray-900 hover:text-primary-600 block truncate max-w-[160px]"
                        >
                          {p.name}
                        </Link>
                        <span className="text-xs text-gray-400">{p.project_code}</span>
                      </td>
                      <td className="py-3 pr-2 hidden sm:table-cell text-gray-600 truncate max-w-[120px]">
                        {p.client_name}
                      </td>
                      <td className="py-3 pr-2">
                        <StatusBadge status={p.status} />
                      </td>
                      <td className="py-3 hidden md:table-cell text-gray-500 whitespace-nowrap">
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
            <h3 className="text-lg font-semibold text-gray-900">最近のインシデント</h3>
            <Link to="/itsm" className="text-sm text-primary-600 hover:text-primary-700">
              すべて表示 →
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
                  to={`/itsm`}
                  className="block p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <span className="text-xs text-gray-400 font-mono shrink-0">
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
                  <p className="text-sm font-medium text-gray-800 leading-snug line-clamp-2">
                    {inc.title}
                  </p>
                  <div className="flex items-center justify-between mt-2">
                    <IncidentStatusBadge status={inc.status} />
                    <span className="text-xs text-gray-400">
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
    </div>
  );
}
