import api from "./client";
import { PaginatedResponse } from "./projects";

export interface KnowledgeArticleCreate {
  title: string;
  content: string;
  category?: string;
  tags?: string;
  is_published?: boolean;
}

export interface KnowledgeArticle {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string | null;
  is_published: boolean;
  view_count: number;
  rating: number | null;
  created_at: string;
  updated_at: string;
}

export interface AiSearchRequest {
  query: string;
  category?: string;
  max_results?: number;
}

export interface AiSearchResult {
  article_id: string;
  title: string;
  excerpt: string;
  category: string;
  score: number;
  tags: string | null;
}

export interface AiSearchResponse {
  query: string;
  results: AiSearchResult[];
  ai_answer: string | null;
  total_results: number;
}

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
    const res = await api.put<{ data: KnowledgeArticle }>(
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
