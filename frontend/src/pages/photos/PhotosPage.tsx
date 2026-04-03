import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { fetchPhotos, uploadPhoto, deletePhoto, type Photo } from "@/api/photos";
import { projectsApi, type Project as ProjectItem } from "@/api/projects";

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

const CATEGORY_COLORS: Record<Photo["category"], string> = {
  GENERAL: "bg-gray-100 text-gray-700",
  PROGRESS: "bg-blue-100 text-blue-700",
  SAFETY: "bg-yellow-100 text-yellow-700",
  COMPLETION: "bg-green-100 text-green-700",
  TROUBLE: "bg-red-100 text-red-700",
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

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">🖼️ 写真・資料管理</h1>
        <span className="text-sm text-gray-500">{photos.length} 件</span>
      </div>

      {/* プロジェクト選択 */}
      <div className="bg-white rounded-lg shadow p-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">工事案件</label>
        <select
          className="w-full md:w-64 border border-gray-300 rounded-md px-3 py-2 text-sm"
          value={selectedProject}
          onChange={(e) => setSelectedProject(e.target.value)}
        >
          <option value="">案件を選択...</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      {selectedProject && (
        <>
          {/* アップロードフォーム */}
          <div className="bg-white rounded-lg shadow p-4 space-y-3">
            <h2 className="text-sm font-semibold text-gray-700">📤 写真アップロード</h2>
            <div className="flex flex-wrap gap-3 items-end">
              <div>
                <label className="block text-xs text-gray-500 mb-1">カテゴリ</label>
                <select
                  className="border border-gray-300 rounded px-2 py-1.5 text-sm"
                  value={category}
                  onChange={(e) => setCategory(e.target.value as Photo["category"])}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {CATEGORY_LABELS[c]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex-1 min-w-40">
                <label className="block text-xs text-gray-500 mb-1">説明（任意）</label>
                <input
                  type="text"
                  className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
                  placeholder="写真の説明"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
              <div>
                <label className="cursor-pointer bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700 transition">
                  {uploading ? "アップロード中..." : "ファイル選択"}
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
          </div>

          {/* フィルター */}
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setFilterCategory("ALL")}
              className={`px-3 py-1 rounded-full text-sm font-medium transition ${
                filterCategory === "ALL"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              すべて ({photos.length})
            </button>
            {CATEGORIES.map((c) => {
              const count = photos.filter((p) => p.category === c).length;
              return (
                <button
                  key={c}
                  onClick={() => setFilterCategory(c)}
                  className={`px-3 py-1 rounded-full text-sm font-medium transition ${
                    filterCategory === c
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {CATEGORY_LABELS[c]} ({count})
                </button>
              );
            })}
          </div>
        </>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded p-3 text-sm">
          {error}
        </div>
      )}

      {loading && (
        <div className="text-center py-12 text-gray-400">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-3" />
          読み込み中...
        </div>
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
            <div
              key={photo.id}
              className="bg-white rounded-lg shadow overflow-hidden group relative"
            >
              {photo.url ? (
                <img
                  src={photo.url}
                  alt={photo.original_filename}
                  className="w-full h-40 object-cover"
                />
              ) : (
                <div className="w-full h-40 bg-gray-100 flex items-center justify-center text-gray-400">
                  <span className="text-3xl">📄</span>
                </div>
              )}
              <div className="p-3 space-y-1">
                <div className="flex items-center justify-between">
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded-full ${CATEGORY_COLORS[photo.category]}`}
                  >
                    {CATEGORY_LABELS[photo.category]}
                  </span>
                  <button
                    onClick={() => handleDelete(photo.id)}
                    className="text-xs text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition"
                  >
                    削除
                  </button>
                </div>
                <p className="text-xs text-gray-600 truncate">{photo.original_filename}</p>
                {photo.description && (
                  <p className="text-xs text-gray-400 truncate">{photo.description}</p>
                )}
                <p className="text-xs text-gray-400">
                  {(photo.file_size / 1024).toFixed(0)} KB ·{" "}
                  {new Date(photo.created_at).toLocaleDateString("ja-JP")}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
