import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import PhotosPage from "./PhotosPage";

vi.mock("@/api/photos", () => ({
  fetchPhotos: vi.fn(),
  uploadPhoto: vi.fn(),
  deletePhoto: vi.fn(),
}));

vi.mock("@/api/projects", () => ({
  projectsApi: {
    list: vi.fn(),
    get: vi.fn(),
  },
}));

import { fetchPhotos } from "@/api/photos";
import { projectsApi } from "@/api/projects";

function renderPage(projectId = "p1") {
  return render(
    <MemoryRouter initialEntries={[`/projects/${projectId}/photos`]}>
      <Routes>
        <Route path="/projects/:projectId/photos" element={<PhotosPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("PhotosPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(projectsApi.list).mockResolvedValue({
      data: [
        { id: "p1", project_code: "PRJ-001", name: "テスト工事", status: "IN_PROGRESS", client_name: "テスト" },
      ],
      meta: { page: 1, per_page: 20, total: 1, pages: 1 },
    });
    vi.mocked(fetchPhotos).mockResolvedValue({
      data: [],
      meta: { total: 0, page: 1, per_page: 20, pages: 0 },
    });
  });

  it("ページ見出しが表示される", () => {
    renderPage();
    expect(screen.getByText(/写真・資料管理/)).toBeInTheDocument();
  });

  it("写真がない場合は空状態メッセージが表示される", async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("写真・資料がありません")).toBeInTheDocument();
    });
  });

  it("写真一覧が表示される", async () => {
    vi.mocked(fetchPhotos).mockResolvedValue({
      data: [
        {
          id: "ph1",
          project_id: "p1",
          filename: "test.jpg",
          original_filename: "test.jpg",
          file_url: "/files/test.jpg",
          category: "GENERAL",
          description: "テスト写真",
          uploaded_by: "u1",
          created_at: "2026-04-04T00:00:00Z",
        },
      ],
      meta: { total: 1, page: 1, per_page: 20, pages: 1 },
    });

    renderPage();
    await waitFor(() => {
      expect(screen.getByText("テスト写真")).toBeInTheDocument();
    });
  });
});
