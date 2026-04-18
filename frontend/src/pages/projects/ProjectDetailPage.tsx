import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Building2 } from "lucide-react";
import { Card, Skeleton } from "@/components/ui";
import { projectsApi } from "@/api/projects";
import { TABS, type TabKey } from "./constants";
import { InfoTab, ReportsTab, SafetyTab, CostTab, PhotosTab } from "./tabs";

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState<TabKey>("info");

  const { data: project, isLoading } = useQuery({
    queryKey: ["project", id],
    queryFn: () => projectsApi.get(id!),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <Card className="text-center py-12">
        <Skeleton className="h-8 w-48 mx-auto mb-4" />
        <Skeleton className="h-4 w-32 mx-auto" />
      </Card>
    );
  }
  if (!project || !id) {
    return <Card className="text-center py-12 text-red-400">案件が見つかりません</Card>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/projects" className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <Building2 className="w-6 h-6 text-primary-600" />
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{project.name}</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">{project.project_code}</p>
        </div>
      </div>

      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex gap-1 -mb-px overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors ${
                activeTab === tab.key
                  ? "border-b-2 border-primary-600 text-primary-600"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:border-b-2 hover:border-gray-300 dark:hover:border-gray-500"
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      <div>
        {activeTab === "info"    && <InfoTab project={project} projectId={id} />}
        {activeTab === "reports" && <ReportsTab projectId={id} />}
        {activeTab === "safety"  && <SafetyTab projectId={id} />}
        {activeTab === "cost"    && <CostTab projectId={id} />}
        {activeTab === "photos"  && <PhotosTab projectId={id} />}
      </div>
    </div>
  );
}
