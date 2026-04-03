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

// ── Skeleton ──────────────────────────────────────────────────────────────────
function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-gray-200 rounded ${className ?? ""}`} />;
}

// ── StatCard ──────────────────────────────────────────────────────────────────
function StatCard({
  title,
  value,
  icon: Icon,
  to,
  color,
  label,
  loading,
}: {
  title: string;
  value: string | number;
  icon: typeof Building2;
  to: string;
  color: string;
  label?: string;
  loading?: boolean;
}) {
  return (
    <Link to={to} className="card hover:shadow-md transition-shadow block">
      <div className="flex items-center justify-between">
        <div className="min-w-0">
          <p className="text-sm text-gray-500 truncate">{title}</p>
          {loading ? (
            <Skeleton className="h-8 w-16 mt-1" />
          ) : (
            <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          )}
          {label && !loading && (
            <p className="text-xs text-gray-400 mt-0.5">{label}</p>
          )}
        </div>
        <div className={`p-3 rounded-full flex-shrink-0 ml-3 ${color}`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </Link>
  );
}

// ── StatusBadge ───────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    PLANNING: "badge-info",
    IN_PROGRESS: "badge-success",
    ON_HOLD: "badge-warning",
    COMPLETED: "badge-info",
    CANCELLED: "badge-danger",
  };
  const labels: Record<string, string> = {
    PLANNING: "計画中",
    IN_PROGRESS: "進行中",
    ON_HOLD: "保留",
    COMPLETED: "完了",
    CANCELLED: "中止",
  };
  return (
    <span className={map[status] ?? "badge-info"}>{labels[status] ?? status}</span>
  );
}

// ── IncidentStatusBadge ───────────────────────────────────────────────────────
function IncidentStatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    OPEN: "badge-danger",
    IN_PROGRESS: "badge-warning",
    RESOLVED: "badge-success",
    CLOSED: "badge-info",
  };
  const labels: Record<string, string> = {
    OPEN: "未対応",
    IN_PROGRESS: "対応中",
    RESOLVED: "解決済",
    CLOSED: "クローズ",
  };
  return (
    <span className={map[status] ?? "badge-info"}>{labels[status] ?? status}</span>
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
      className="card flex flex-col items-center gap-3 py-5 hover:shadow-md hover:scale-[1.02] transition-all text-center"
    >
      <div className={`p-3 rounded-full ${color}`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
      <span className="text-sm font-medium text-gray-700">{label}</span>
    </Link>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { user } = useAuthStore();

  // 全案件（総数 + IN_PROGRESS フィルター用に多め取得）
  const { data: allProjects, isLoading: loadingAllProjects } = useQuery({
    queryKey: ["dashboard-projects-all"],
    queryFn: () => projectsApi.list(1, 100),
  });

  // 直近5件表示用
  const { data: recentProjects, isLoading: loadingRecent } = useQuery({
    queryKey: ["dashboard-projects-recent"],
    queryFn: () => projectsApi.list(1, 5),
  });

  // インシデント総数（meta.total）
  const { data: incidentsMeta, isLoading: loadingIncidentsMeta } = useQuery({
    queryKey: ["dashboard-incidents-meta"],
    queryFn: () => itsmApi.listIncidents(1, 1),
  });

  // 直近3件インシデント
  const { data: recentIncidents, isLoading: loadingIncidents } = useQuery({
    queryKey: ["dashboard-incidents-recent"],
    queryFn: () => itsmApi.listIncidents(1, 3),
  });

  const totalProjects = allProjects?.meta.total ?? 0;
  const inProgressCount =
    allProjects?.data.filter((p) => p.status === "IN_PROGRESS").length ?? 0;
  const openIncidents =
    incidentsMeta?.meta.total ?? 0;

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
        <StatCard
          title="工事案件数 (合計)"
          value={totalProjects}
          icon={Building2}
          to="/projects"
          color="bg-blue-500"
          label="全登録案件"
          loading={loadingAllProjects}
        />
        <StatCard
          title="進行中案件"
          value={inProgressCount}
          icon={TrendingUp}
          to="/projects"
          color="bg-green-500"
          label="IN_PROGRESS"
          loading={loadingAllProjects}
        />
        <StatCard
          title="今月の日報"
          value={inProgressCount > 0 ? `${inProgressCount} 案件分` : "—"}
          icon={FileText}
          to="/reports"
          color="bg-purple-500"
          label="進行中案件より推算"
          loading={loadingAllProjects}
        />
        <StatCard
          title="インシデント"
          value={openIncidents}
          icon={AlertCircle}
          to="/itsm"
          color="bg-red-500"
          label="登録件数合計"
          loading={loadingIncidentsMeta}
        />
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
        <div className="card lg:col-span-2">
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
        </div>

        {/* Recent Incidents */}
        <div className="card">
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
        </div>
      </div>
    </div>
  );
}
