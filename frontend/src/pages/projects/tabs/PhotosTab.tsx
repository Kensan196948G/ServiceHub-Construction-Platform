import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Image, Trash2 } from "lucide-react";
import { Badge, Card, Select, Skeleton } from "@/components/ui";
import { fetchPhotos, uploadPhoto, deletePhoto, type Photo } from "@/api/photos";
import { PHOTO_CATEGORY_LABELS, PHOTO_CATEGORY_VARIANT } from "../constants";

export function PhotosTab({ projectId }: { projectId: string }) {
  const [uploading, setUploading] = useState(false);
  const [category, setCategory] = useState<Photo["category"]>("GENERAL");
  const [error, setError] = useState<string | null>(null);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["photos", projectId],
    queryFn: () => fetchPhotos(projectId),
  });

  const photos: Photo[] = data?.data ?? [];

  const deleteMutation = useMutation({
    mutationFn: (photoId: string) => deletePhoto(projectId, photoId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["photos", projectId] }),
  });

  const handleDelete = (p: Photo) => {
    if (window.confirm(`写真「${p.original_filename}」を削除しますか？`)) {
      deleteMutation.mutate(p.id);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      await uploadPhoto(projectId, file, category);
      qc.invalidateQueries({ queryKey: ["photos", projectId] });
    } catch {
      setError("アップロードに失敗しました");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const photoCategoryOptions = (Object.keys(PHOTO_CATEGORY_LABELS) as Photo["category"][]).map(
    (c) => ({ value: c, label: PHOTO_CATEGORY_LABELS[c] })
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-between items-center gap-2">
        <h4 className="font-semibold text-gray-900 dark:text-white">写真一覧</h4>
        <div className="flex items-center gap-2">
          <Select
            value={category}
            onChange={(e) => setCategory(e.target.value as Photo["category"])}
            options={photoCategoryOptions}
            className="py-1.5"
          />
          <label className="inline-flex items-center justify-center rounded-md font-medium transition-colors bg-primary-600 text-white hover:bg-primary-700 h-8 px-3 text-sm cursor-pointer gap-1">
            <Plus className="w-4 h-4" />
            {uploading ? "アップロード中…" : "写真を追加"}
            <input type="file" accept="image/*" className="hidden" onChange={handleUpload} disabled={uploading} />
          </label>
        </div>
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="aspect-square rounded-xl" />
          ))}
        </div>
      ) : photos.length === 0 ? (
        <Card className="text-center py-12">
          <p className="text-4xl mb-3">🖼️</p>
          <p className="text-gray-500 dark:text-gray-400 mb-4">写真がまだありません</p>
          <label className="inline-flex items-center justify-center rounded-md font-medium transition-colors bg-primary-600 text-white hover:bg-primary-700 h-8 px-3 text-sm cursor-pointer">
            追加する
            <input type="file" accept="image/*" className="hidden" onChange={handleUpload} disabled={uploading} />
          </label>
        </Card>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {photos.map((p) => (
            <div key={p.id} className="relative group rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-700 aspect-square">
              {p.url ? (
                <img src={p.url} alt={p.original_filename} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400 dark:text-gray-500">
                  <Image className="w-8 h-8" />
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="absolute top-2 right-2">
                  <button
                    className="p-1.5 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors shadow"
                    onClick={() => handleDelete(p)}
                    title="削除"
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-2">
                  <Badge variant={PHOTO_CATEGORY_VARIANT[p.category]} size="sm">
                    {PHOTO_CATEGORY_LABELS[p.category]}
                  </Badge>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
