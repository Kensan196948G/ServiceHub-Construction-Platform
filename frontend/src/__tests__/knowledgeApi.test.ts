import { describe, it, expect, vi, beforeEach } from "vitest";
import api from "@/api/client";
import { knowledgeApi } from "@/api/knowledge";

vi.mock("@/api/client", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

describe("knowledgeApi", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("create は POST /knowledge/articles を呼ぶ", async () => {
    const payload = { title: "記事タイトル", content: "本文", category: "技術" };
    vi.mocked(api.post).mockResolvedValue({
      data: { data: { id: "art-1", ...payload, view_count: 0 } },
    });

    const result = await knowledgeApi.create(payload);

    expect(api.post).toHaveBeenCalledWith("/knowledge/articles", payload);
    expect(result.title).toBe("記事タイトル");
  });

  it("list はページネーション付きで GET を呼ぶ", async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: {
        data: [{ id: "art-1", title: "Test" }],
        meta: { page: 1, per_page: 20, total: 1 },
      },
    });

    const result = await knowledgeApi.list(1, 20);

    expect(api.get).toHaveBeenCalledWith("/knowledge/articles", {
      params: { page: 1, per_page: 20 },
    });
    expect(result.data).toHaveLength(1);
  });

  it("get は GET /knowledge/articles/:id を呼ぶ", async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: { data: { id: "art-1", title: "記事" } },
    });

    const result = await knowledgeApi.get("art-1");

    expect(api.get).toHaveBeenCalledWith("/knowledge/articles/art-1");
    expect(result.title).toBe("記事");
  });

  it("search は POST /knowledge/search を呼ぶ", async () => {
    vi.mocked(api.post).mockResolvedValue({
      data: { query: "基礎工事", results: [], total_results: 0 },
    });

    const result = await knowledgeApi.search({ query: "基礎工事" });

    expect(api.post).toHaveBeenCalledWith("/knowledge/search", {
      query: "基礎工事",
    });
    expect(result.total_results).toBe(0);
  });

  it("delete は DELETE /knowledge/articles/:id を呼ぶ", async () => {
    vi.mocked(api.delete).mockResolvedValue({});

    await knowledgeApi.delete("art-1");

    expect(api.delete).toHaveBeenCalledWith("/knowledge/articles/art-1");
  });
});
