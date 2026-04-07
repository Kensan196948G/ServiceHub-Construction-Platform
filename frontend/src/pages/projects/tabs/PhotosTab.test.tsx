import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PhotosTab } from "./PhotosTab";

vi.mock("@/api/photos", () => ({
  fetchPhotos: vi.fn(),
  uploadPhoto: vi.fn(),
  deletePhoto: vi.fn(),
}));

import { fetchPhotos, deletePhoto } from "@/api/photos";

const emptyPhotos = { data: [], meta: { page: 1, per_page: 20, total: 0, pages: 0 } };

const mockPhotos = {
  data: [
    {
      id: "ph1", project_id: "p1", original_filename: "現場写真01.jpg",
      category: "PROGRESS" as const, url: "https://example.com/photo1.jpg",
      created_at: "", updated_at: "",
    },
    {
      id: "ph2", project_id: "p1", original_filename: "安全確認.jpg",
      category: "SAFETY" as const, url: null,
      created_at: "", updated_at: "",
    },
  ],
  meta: { page: 1, per_page: 20, total: 2, pages: 1 },
};

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
}

function renderTab() {
  return render(
    <QueryClientProvider client={makeQueryClient()}>
      <PhotosTab projectId="p1" />
    </QueryClientProvider>,
  );
}

describe("PhotosTab", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fetchPhotos).mockResolvedValue(emptyPhotos);
  });

  it("データなし状態が表示される", async () => {
    renderTab();
    await waitFor(() => {
      expect(screen.getByText("写真がまだありません")).toBeInTheDocument();
    });
  });

  it("「写真一覧」見出しが表示される", async () => {
    renderTab();
    await waitFor(() => {
      expect(screen.getByText("写真一覧")).toBeInTheDocument();
    });
  });

  it("写真データが表示される（グリッド）", async () => {
    vi.mocked(fetchPhotos).mockResolvedValue(mockPhotos);
    renderTab();
    await waitFor(() => {
      expect(screen.getByAltText("現場写真01.jpg")).toBeInTheDocument();
    });
  });

  it("URLがない写真はプレースホルダーが表示される", async () => {
    vi.mocked(fetchPhotos).mockResolvedValue(mockPhotos);
    renderTab();
    await waitFor(() => {
      expect(screen.getByAltText("現場写真01.jpg")).toBeInTheDocument();
    });
    // ph2 has no URL so no img with alt "安全確認.jpg"
    expect(screen.queryByAltText("安全確認.jpg")).not.toBeInTheDocument();
  });

  it("カテゴリセレクタが存在する", async () => {
    renderTab();
    await waitFor(() => {
      expect(screen.getByText("写真一覧")).toBeInTheDocument();
    });
    const selects = screen.getAllByRole("combobox");
    expect(selects.length).toBeGreaterThan(0);
  });

  it("削除ボタンをクリックすると確認後に API が呼ばれる", async () => {
    vi.mocked(fetchPhotos).mockResolvedValue(mockPhotos);
    vi.mocked(deletePhoto).mockResolvedValue(undefined);
    window.confirm = vi.fn(() => true);
    renderTab();
    await waitFor(() => screen.getByAltText("現場写真01.jpg"));
    const deleteBtns = screen.getAllByTitle("削除");
    fireEvent.click(deleteBtns[0]);
    expect(window.confirm).toHaveBeenCalled();
    await waitFor(() => {
      expect(deletePhoto).toHaveBeenCalledWith("p1", "ph1");
    });
  });
});
