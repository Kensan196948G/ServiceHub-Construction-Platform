import api from "./client";
import type { PaginatedResponse } from "./projects";
import type {
  KnowledgeArticleResponse,
  KnowledgeArticleCreate,
  AiSearchRequest,
  AiSearchResult,
  AiSearchResponse,
} from "@/generated";

// Re-export with backward-compatible aliases
export type KnowledgeArticle = KnowledgeArticleResponse;
export type { KnowledgeArticleCreate, AiSearchRequest, AiSearchResult, AiSearchResponse };

export const knowledgeApi = {
  create: async (data: KnowledgeArticleCreate) => {
    const res = await api.post<{ data: KnowledgeArticle }>(
      "/knowledge/articles",
      data
    );
    return res.data.data;
  },

  list: async (page = 1, perPage = 20) => {
    const res = await api.get<PaginatedResponse<KnowledgeArticle>>(
      "/knowledge/articles",
      { params: { page, per_page: perPage } }
    );
    return res.data;
  },

  get: async (id: string) => {
    const res = await api.get<{ data: KnowledgeArticle }>(
      `/knowledge/articles/${id}`
    );
    return res.data.data;
  },

  update: async (id: string, data: Partial<KnowledgeArticleCreate>) => {
    const res = await api.patch<{ data: KnowledgeArticle }>(
      `/knowledge/articles/${id}`,
      data
    );
    return res.data.data;
  },

  delete: async (id: string) => {
    await api.delete(`/knowledge/articles/${id}`);
  },

  search: async (data: AiSearchRequest) => {
    const res = await api.post<AiSearchResponse>("/knowledge/search", data);
    return res.data;
  },
};
