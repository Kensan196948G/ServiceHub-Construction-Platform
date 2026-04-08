import { describe, it, expect, vi, beforeEach } from "vitest";
import api from "@/api/client";
import { fetchPhotos, uploadPhoto, deletePhoto } from "@/api/photos";

vi.mock("@/api/client", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
  },
}));

describe("photosApi", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetchPhotos は GET /projects/:id/photos を呼ぶ", async () => {
    const mockData = {
      success: true,
      data: [{ id: "ph1", project_id: "p1", filename: "test.jpg" }],
      meta: { total: 1, page: 1, per_page: 20, pages: 1 },
    };
    vi.mocked(api.get).mockResolvedValue({ data: mockData });

    const result = await fetchPhotos("p1");

    expect(api.get).toHaveBeenCalledWith("/projects/p1/photos", {
      params: { page: 1, per_page: 20 },
    });
    expect(result.data).toHaveLength(1);
  });

  it("fetchPhotos はページ番号を渡せる", async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: { success: true, data: [], meta: { total: 0, page: 2, per_page: 20, pages: 0 } },
    });

    await fetchPhotos("p1", 2);

    expect(api.get).toHaveBeenCalledWith("/projects/p1/photos", {
      params: { page: 2, per_page: 20 },
    });
  });

  it("uploadPhoto は POST /projects/:id/photos を multipart で呼ぶ", async () => {
    const mockFile = new File(["dummy"], "photo.jpg", { type: "image/jpeg" });
    vi.mocked(api.post).mockResolvedValue({ data: { id: "ph1" } });

    await uploadPhoto("p1", mockFile, "GENERAL", "説明文");

    expect(api.post).toHaveBeenCalledWith(
      "/projects/p1/photos",
      expect.any(FormData),
    );
  });

  it("deletePhoto は DELETE /projects/:id/photos/:photoId を呼ぶ", async () => {
    vi.mocked(api.delete).mockResolvedValue({ data: {} });

    await deletePhoto("p1", "ph1");

    expect(api.delete).toHaveBeenCalledWith("/projects/p1/photos/ph1");
  });
});
