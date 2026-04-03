import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Building2 } from "lucide-react";
import { projectsApi } from "@/api/projects";

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: project, isLoading } = useQuery({
    queryKey: ["project", id],
    queryFn: () => projectsApi.get(id!),
    enabled: !!id,
  });

  if (isLoading) {
    return <div className="card text-center py-12 text-gray-400">読み込み中...</div>;
  }
  if (!project) {
    return <div className="card text-center py-12 text-red-400">案件が見つかりません</div>;
  }

  const fields = [
    { label: "案件コード", value: project.project_code },
    { label: "施主名", value: project.client_name },
    { label: "ステータス", value: project.status },
    { label: "現場住所", value: project.location ?? "—" },
    { label: "予算", value: project.budget ? `¥${project.budget.toLocaleString()}` : "—" },
    { label: "開始日", value: project.start_date ?? "—" },
    { label: "完了日", value: project.end_date ?? "—" },
    { label: "説明", value: project.description ?? "—" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/projects" className="text-gray-400 hover:text-gray-600">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <Building2 className="w-6 h-6 text-primary-600" />
        <h2 className="text-2xl font-bold text-gray-900">{project.name}</h2>
      </div>

      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">案件詳細</h3>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
          {fields.map(({ label, value }) => (
            <div key={label}>
              <dt className="text-xs font-medium text-gray-500 uppercase">{label}</dt>
              <dd className="mt-1 text-sm text-gray-900">{value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}
