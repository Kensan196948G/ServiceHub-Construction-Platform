import api from "./client";

export interface Photo {
  id: string;
  project_id: string;
  filename: string;
  original_filename: string;
  file_size: number;
  mime_type: string;
  category: "GENERAL" | "PROGRESS" | "SAFETY" | "COMPLETION" | "TROUBLE";
  description: string | null;
  taken_at: string | null;
  url: string | null;
  created_at: string;
}

export interface PhotoListResponse {
  success: boolean;
  data: Photo[];
  meta: { total: number; page: number; per_page: number; pages: number };
}

export const fetchPhotos = (projectId: string, page = 1) =>
  api
    .get<PhotoListResponse>(`/projects/${projectId}/photos`, {
      params: { page, per_page: 20 },
    })
    .then((r) => r.data);

export const uploadPhoto = (
  projectId: string,
  file: File,
  category: Photo["category"],
  description?: string,
) => {
  const form = new FormData();
  form.append("file", file);
  form.append("category", category);
  if (description) form.append("description", description);
  return api
    .post(`/projects/${projectId}/photos`, form)
    .then((r) => r.data);
};

export const deletePhoto = (projectId: string, photoId: string) =>
  api.delete(`/projects/${projectId}/photos/${photoId}`).then((r) => r.data);
