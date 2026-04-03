import { useQuery } from "@tanstack/react-query";
import { Building2, FileText, HardHat, AlertCircle, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";
import { projectsApi } from "@/api/projects";
import { useAuthStore } from "@/stores/authStore";

const StatCard = ({
  title,
  value,
  icon: Icon,
  to,
  color,
}: {
  title: string;
  value: string | number;
  icon: typeof Building2;
  to: string;
  color: string;
}) => (
  <Link to={to} className="card hover:shadow-md transition-shadow block">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm text-gray-500">{title}</p>
        <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
      </div>
      <div className={`p-3 rounded-full ${color}`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
    </div>
  </Link>
);

export default function DashboardPage() {
  const { user } = useAuthStore();
  const { data: projects } = useQuery({
    queryKey: ["projects"],
    queryFn: () => projectsApi.list(1, 5),
  });

  const total = projects?.meta.total ?? 0;
  const active = projects?.data.filter((p) => p.status === "IN_PROGRESS").length ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">
          こんにちは、{user?.full_name ?? "ユーザー"}さん
        </h2>
        <p className="text-gray-500 text-sm mt-1">ServiceHub 工事管理プラットフォーム</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="工事案件 (合計)"
          value={total}
          icon={Building2}
          to="/projects"
          color="bg-blue-500"
        />
        <StatCard
          title="進行中案件"
          value={active}
          icon={TrendingUp}
          to="/projects"
          color="bg-green-500"
        />
        <StatCard
          title="日報"
          value="—"
          icon={FileText}
          to="/reports"
          color="bg-purple-500"
        />
        <StatCard
          title="安全品質"
          value="—"
          icon={HardHat}
          to="/safety"
          color="bg-orange-500"
        />
      </div>

      {/* Recent projects */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">最近の工事案件</h3>
          <Link to="/projects" className="text-sm text-primary-600 hover:text-primary-700">
            すべて表示 →
          </Link>
        </div>

        {projects && projects.data.length > 0 ? (
          <div className="divide-y divide-gray-100">
            {projects.data.map((p) => (
              <Link
                key={p.id}
                to={`/projects/${p.id}`}
                className="flex items-center justify-between py-3 hover:bg-gray-50 -mx-2 px-2 rounded transition-colors"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900">{p.name}</p>
                  <p className="text-xs text-gray-500">
                    {p.project_code} • {p.client_name}
                  </p>
                </div>
                <StatusBadge status={p.status} />
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-400">
            <AlertCircle className="w-10 h-10 mx-auto mb-2" />
            <p className="text-sm">案件がありません</p>
          </div>
        )}
      </div>
    </div>
  );
}

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
