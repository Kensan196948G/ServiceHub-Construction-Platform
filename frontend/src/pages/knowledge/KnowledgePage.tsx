import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { BookOpen, Plus, Search, Sparkles, ChevronDown, ChevronUp, X, Eye } from "lucide-react";
import { knowledgeApi, KnowledgeArticleCreate, KnowledgeArticle } from "@/api/knowledge";

const CATEGORIES = ["全て", "SAFETY", "QUALITY", "COST", "TECHNICAL", "PROCEDURE", "GENERAL"] as const;
const CATEGORY_LABEL: Record<string, string> = {
  全て: "全て", SAFETY: "安全", QUALITY: "品質", COST: "原価",
  TECHNICAL: "技術", PROCEDURE: "手順", GENERAL: "一般",
};

export default function KnowledgePage() {
  const queryClient = useQueryClient();
  const [selectedCategory, setSelectedCategory] = useState("全て");
  const [keyword, setKeyword] = useState("");
  const [aiQuery, setAiQuery] = useState("");
  const [aiAnswer, setAiAnswer] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<KnowledgeArticleCreate>({
    title: "",
    category: "GENERAL",
    tags: "",
    content: "",
    is_published: true,
  });

  const { data: articlesData, isLoading, error } = useQuery({
    queryKey: ["knowledge"],
    queryFn: () => knowledgeApi.list(1, 100),
  });

  const aiSearchMutation = useMutation({
    mutationFn: (query: string) => knowledgeApi.search({ query }),
    onSuccess: (result) => {
      setAiAnswer(result.ai_answer ?? "回答が見つかりませんでした");
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: KnowledgeArticleCreate) => knowledgeApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["knowledge"] });
      setShowModal(false);
    },
  });

  const articles = articlesData?.data ?? [];

  const filtered = articles.filter((a: KnowledgeArticle) => {
    const matchCategory = selectedCategory === "全て" || a.category === selectedCategory;
    const matchKeyword = !keyword ||
      a.title.toLowerCase().includes(keyword.toLowerCase()) ||
      a.content.toLowerCase().includes(keyword.toLowerCase());
    return matchCategory && matchKeyword;
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    createMutation.mutate(form);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <BookOpen className="w-7 h-7 text-primary-600" />
          AIナレッジベース
        </h2>
        <button className="btn-primary" onClick={() => setShowModal(true)}>
          <Plus className="w-4 h-4 mr-1" />
          新規記事作成
        </button>
      </div>

      {/* AI検索エリア */}
      <div className="card bg-gradient-to-r from-primary-50 to-blue-50 border-primary-200">
        <p className="text-sm font-semibold text-primary-700 mb-2 flex items-center gap-1">
          <Sparkles className="w-4 h-4" />
          AI検索
        </p>
        <div className="flex gap-2">
          <input
            type="text"
            className="input flex-1"
            placeholder="質問を入力してください..."
            value={aiQuery}
            onChange={(e) => setAiQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && aiQuery.trim()) {
                aiSearchMutation.mutate(aiQuery.trim());
              }
            }}
          />
          <button
            className="btn-primary"
            onClick={() => aiQuery.trim() && aiSearchMutation.mutate(aiQuery.trim())}
            disabled={aiSearchMutation.isPending}
          >
            <Sparkles className="w-4 h-4 mr-1" />
            {aiSearchMutation.isPending ? "検索中..." : "AI検索"}
          </button>
        </div>
        {aiAnswer && (
          <div className="mt-3 p-3 bg-white rounded-lg border border-primary-200 text-sm text-gray-700 whitespace-pre-wrap">
            {aiAnswer}
          </div>
        )}
      </div>

      {/* フィルター */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            className="input pl-9"
            placeholder="キーワード検索..."
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
          />
        </div>
        <select
          className="input w-40"
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>{CATEGORY_LABEL[c] ?? c}</option>
          ))}
        </select>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-300 text-red-700 px-4 py-3 rounded">
          データの取得に失敗しました。
        </div>
      )}

      {isLoading ? (
        <div className="card text-center py-16 text-gray-400">読み込み中...</div>
      ) : filtered.length === 0 ? (
        <div className="card text-center py-16 text-gray-400">
          <BookOpen className="w-12 h-12 mx-auto mb-3" />
          <p className="text-lg font-medium">記事が見つかりません</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((article: KnowledgeArticle) => {
            const tags = article.tags ? article.tags.split(",").map((t) => t.trim()).filter(Boolean) : [];
            return (
              <div key={article.id} className="card">
                <div
                  className="flex items-start justify-between cursor-pointer"
                  onClick={() => setExpandedId(expandedId === article.id ? null : article.id)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h3 className="font-semibold text-gray-900">{article.title}</h3>
                      <span className="badge-info">{CATEGORY_LABEL[article.category] ?? article.category}</span>
                      {!article.is_published && (
                        <span className="badge-warning">非公開</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Eye className="w-3 h-3" />
                        {article.view_count}
                      </span>
                      {tags.map((tag) => (
                        <span key={tag} className="bg-gray-100 px-2 py-0.5 rounded-full">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="ml-2 text-gray-400 flex-shrink-0">
                    {expandedId === article.id ? (
                      <ChevronUp className="w-5 h-5" />
                    ) : (
                      <ChevronDown className="w-5 h-5" />
                    )}
                  </div>
                </div>
                {expandedId === article.id && (
                  <div className="mt-4 pt-4 border-t border-gray-100 text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                    {article.content}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-white">
              <h3 className="text-lg font-semibold">新規記事作成</h3>
              <button onClick={() => setShowModal(false)}>
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">タイトル</label>
                <input type="text" className="input" value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })} required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">カテゴリ</label>
                  <select className="input" value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}>
                    {CATEGORIES.filter((c) => c !== "全て").map((c) => (
                      <option key={c} value={c}>{CATEGORY_LABEL[c] ?? c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">タグ（カンマ区切り）</label>
                  <input type="text" className="input" value={form.tags ?? ""}
                    onChange={(e) => setForm({ ...form, tags: e.target.value })}
                    placeholder="施工, 安全, ..." />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">内容</label>
                <textarea className="input" rows={8} value={form.content}
                  onChange={(e) => setForm({ ...form, content: e.target.value })} required />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="is_published" checked={form.is_published}
                  onChange={(e) => setForm({ ...form, is_published: e.target.checked })} />
                <label htmlFor="is_published" className="text-sm font-medium text-gray-700">公開する</label>
              </div>
              {createMutation.isError && (
                <p className="text-red-600 text-sm">作成に失敗しました。</p>
              )}
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>
                  キャンセル
                </button>
                <button type="submit" className="btn-primary" disabled={createMutation.isPending}>
                  {createMutation.isPending ? "作成中..." : "作成"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

