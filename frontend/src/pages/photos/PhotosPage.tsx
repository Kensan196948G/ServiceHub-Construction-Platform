import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { fetchPhotos, uploadPhoto, deletePhoto, type Photo } from "@/api/photos";
import { projectsApi, type Project as ProjectItem } from "@/api/projects";
import { Badge, Button, Card, ErrorBanner, FormField, Input, Select, Skeleton } from "@/components/ui";

const CATEGORIES: Photo["category"][] = [
  "GENERAL",
  "PROGRESS",
  "SAFETY",
  "COMPLETION",
  "TROUBLE",
];

const CATEGORY_LABELS: Record<Photo["category"], string> = {
  GENERAL: "一般",
  PROGRESS: "工程",
  SAFETY: "安全",
  COMPLETION: "完了",
  TROUBLE: "障害",
};

const CATEGORY_BADGE_VARIANT: Record<Photo["category"], "default" | "info" | "warning" | "success" | "danger"> = {
  GENERAL: "default",
  PROGRESS: "info",
  SAFETY: "warning",
  COMPLETION: "success",
  TROUBLE: "danger",
};

export default function PhotosPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [projects, setProjects] = useState<Pick<ProjectItem, "id" | "name">[]>([]);
  const [selectedProject, setSelectedProject] = useState(projectId ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [category, setCategory] = useState<Photo["category"]>("GENERAL");
  const [description, setDescription] = useState("");
  const [filterCategory, setFilterCategory] = useState<Photo["category"] | "ALL">("ALL");

  useEffect(() => {
    projectsApi
      .list(1, 100)
      .then((r: { data: Pick<ProjectItem, "id" | "name">[] }) => setProjects(r.data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedProject) return;
    setLoading(true);
    fetchPhotos(selectedProject)
      .then((r) => setPhotos(r.data))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [selectedProject]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedProject) return;
    setUploading(true);
    setError(null);
    try {
      await uploadPhoto(selectedProject, file, category, description || undefined);
      const r = await fetchPhotos(selectedProject);
      setPhotos(r.data);
      setDescription("");
    } catch {
      setError("アップロードに失敗しました");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleDelete = async (photoId: string) => {
    if (!selectedProject || !confirm("この写真を削除しますか？")) return;
    try {
      await deletePhoto(selectedProject, photoId);
      setPhotos((prev) => prev.filter((p) => p.id !== photoId));
    } catch {
      setError("削除に失敗しました");
    }
  };

  const filtered =
    filterCategory === "ALL" ? photos : photos.filter((p) => p.category === filterCategory);

  const projectOptions = projects.map((p) => ({ value: p.id, label: p.name }));
  const categoryOptions = CATEGORIES.map((c) => ({ value: c, label: CATEGORY_LABELS[c] }));

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">🖼️ 写真・資料管理</h1>
        <span className="text-sm text-gray-500 dark:text-gray-400">{photos.length} 件</span>
      </div>

      {/* プロジェクト選択 */}
      <Card padding="sm">
        <FormField label="工事案件" htmlFor="project-select">
          <Select
            id="project-select"
            className="w-full md:w-64"
            value={selectedProject}
            onChange={(e) => setSelectedProject(e.target.value)}
            options={projectOptions}
            placeholder="案件を選択..."
          />
        </FormField>
      </Card>

      {selectedProject && (
        <>
          {/* アップロードフォーム */}
          <Card padding="sm" className="space-y-3">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">📤 写真アップロード</h2>
            <div className="flex flex-wrap gap-3 items-end">
              <FormField label="カテゴリ" htmlFor="category-select">
                <Select
                  id="category-select"
                  value={category}
                  onChange={(e) => setCategory(e.target.value as Photo["category"])}
                  options={categoryOptions}
                />
              </FormField>
              <div className="flex-1 min-w-40">
                <FormField label="説明（任意）" htmlFor="description-input">
                  <Input
                    id="description-input"
                    type="text"
                    placeholder="写真の説明"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </FormField>
              </div>
              <div>
                <label className="cursor-pointer">
                  <Button
                    variant="primary"
                    size="sm"
                    loading={uploading}
                    as-child="true"
                    className="pointer-events-none"
                  >
                    {uploading ? "アップロード中..." : "ファイル選択"}
                  </Button>
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    className="hidden"
                    onChange={handleUpload}
                    disabled={uploading}
                  />
                </label>
              </div>
            </div>
          </Card>

          {/* フィルター */}
          <div className="flex gap-2 flex-wrap">
            <Button
              variant={filterCategory === "ALL" ? "primary" : "secondary"}
              size="sm"
              onClick={() => setFilterCategory("ALL")}
              className="rounded-full"
            >
              すべて ({photos.length})
            </Button>
            {CATEGORIES.map((c) => {
              const count = photos.filter((p) => p.category === c).length;
              return (
                <Button
                  key={c}
                  variant={filterCategory === c ? "primary" : "secondary"}
                  size="sm"
                  onClick={() => setFilterCategory(c)}
                  className="rounded-full"
                >
                  {CATEGORY_LABELS[c]} ({count})
                </Button>
              );
            })}
          </div>
        </>
      )}

      {error && (
        <ErrorBanner>{error}</ErrorBanner>
      )}

      {loading && (
        <Card padding="md">
          <div className="space-y-4">
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        </Card>
      )}

      {!loading && selectedProject && filtered.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <div className="text-5xl mb-3">🖼️</div>
          <p>写真・資料がありません</p>
          <p className="text-sm mt-1">上のフォームからアップロードしてください</p>
        </div>
      )}

      {!selectedProject && (
        <div className="text-center py-16 text-gray-400">
          <div className="text-5xl mb-3">📁</div>
          <p>工事案件を選択してください</p>
        </div>
      )}

      {/* フォトグリッド */}
      {filtered.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filtered.map((photo) => (
            <Card
              key={photo.id}
              padding="none"
              className="overflow-hidden group relative"
            >
              {photo.url ? (
                <img
                  src={photo.url}
                  alt={photo.original_filename}
                  className="w-full h-40 object-cover"
                />
              ) : (
                <div className="w-full h-40 bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-400 dark:text-gray-500">
                  <span className="text-3xl">📄</span>
                </div>
              )}
              <div className="p-3 space-y-1">
                <div className="flex items-center justify-between">
                  <Badge variant={CATEGORY_BADGE_VARIANT[photo.category]} size="sm">
                    {CATEGORY_LABELS[photo.category]}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(photo.id)}
                    className="text-xs text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 h-auto px-1 py-0"
                  >
                    削除
                  </Button>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-300 truncate">{photo.original_filename}</p>
                {photo.description && (
                  <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{photo.description}</p>
                )}
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  {(photo.file_size / 1024).toFixed(0)} KB ·{" "}
                  {new Date(photo.created_at).toLocaleDateString("ja-JP")}
                </p>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
