import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { BookOpen, Plus, Search, Sparkles, Eye, Star, Pencil, Trash2 } from "lucide-react";
import { knowledgeApi, KnowledgeArticleCreate, KnowledgeArticle } from "@/api/knowledge";
import { Badge, Button, Card, ErrorBanner, ErrorText, Modal, FormField, Input, Select, Textarea, Skeleton } from "@/components/ui";

const CATEGORIES = ["全て", "SAFETY", "QUALITY", "COST", "TECHNICAL", "PROCEDURE", "GENERAL"] as const;
const CATEGORY_LABEL: Record<string, string> = {
  全て: "全て", SAFETY: "安全", QUALITY: "品質", COST: "原価",
  TECHNICAL: "技術", PROCEDURE: "手順", GENERAL: "一般",
};

const CATEGORY_OPTIONS = CATEGORIES.filter((c) => c !== "全て").map((c) => ({
  value: c,
  label: CATEGORY_LABEL[c] ?? c,
}));

const FILTER_CATEGORY_OPTIONS = CATEGORIES.map((c) => ({
  value: c,
  label: CATEGORY_LABEL[c] ?? c,
}));

export default function KnowledgePage() {
  const queryClient = useQueryClient();
  const [selectedCategory, setSelectedCategory] = useState("全て");
  const [keyword, setKeyword] = useState("");
  const [aiQuery, setAiQuery] = useState("");
  const [aiAnswer, setAiAnswer] = useState("");
  const [selectedArticle, setSelectedArticle] = useState<KnowledgeArticle | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editForm, setEditForm] = useState<KnowledgeArticleCreate>({
    title: "",
    category: "GENERAL",
    tags: "",
    content: "",
    is_published: true,
  });
  const [showCreateModal, setShowCreateModal] = useState(false);
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
    mutationFn: (query: string) => knowledgeApi.search({ query, max_results: 10 }),
    onSuccess: (result) => {
      setAiAnswer(result.ai_answer ?? "回答が見つかりませんでした");
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: KnowledgeArticleCreate) => knowledgeApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["knowledge"] });
      setShowCreateModal(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<KnowledgeArticleCreate> }) =>
      knowledgeApi.update(id, data),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ["knowledge"] });
      setSelectedArticle(updated);
      setIsEditMode(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => knowledgeApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["knowledge"] });
      setSelectedArticle(null);
      setIsEditMode(false);
    },
  });

  function openEditMode(article: KnowledgeArticle) {
    setEditForm({
      title: article.title,
      category: article.category,
      tags: article.tags ?? "",
      content: article.content,
      is_published: article.is_published,
    });
    setIsEditMode(true);
  }

  function handleDelete(article: KnowledgeArticle) {
    if (window.confirm(`「${article.title}」を削除しますか？この操作は取り消せません。`)) {
      deleteMutation.mutate(article.id);
    }
  }

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
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <BookOpen className="w-7 h-7 text-primary-600" />
          AIナレッジベース
        </h2>
        <Button variant="primary" leftIcon={<Plus className="w-4 h-4" />} onClick={() => setShowCreateModal(true)}>
          新規記事作成
        </Button>
      </div>

      {/* AI検索エリア */}
      <Card className="bg-gradient-to-r from-primary-50 to-blue-50 border-primary-200 dark:from-primary-900/20 dark:to-blue-900/20 dark:border-primary-800">
        <p className="text-sm font-semibold text-primary-700 dark:text-primary-300 mb-2 flex items-center gap-1">
          <Sparkles className="w-4 h-4" />
          AI検索
        </p>
        <div className="flex gap-2">
          <Input
            className="flex-1"
            placeholder="質問を入力してください..."
            value={aiQuery}
            onChange={(e) => setAiQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && aiQuery.trim()) {
                aiSearchMutation.mutate(aiQuery.trim());
              }
            }}
          />
          <Button
            variant="primary"
            leftIcon={<Sparkles className="w-4 h-4" />}
            onClick={() => aiQuery.trim() && aiSearchMutation.mutate(aiQuery.trim())}
            loading={aiSearchMutation.isPending}
          >
            {aiSearchMutation.isPending ? "検索中..." : "AI検索"}
          </Button>
        </div>
        {aiAnswer && (
          <div className="mt-3 p-3 bg-white dark:bg-gray-800 rounded-lg border border-primary-200 dark:border-primary-700 text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
            {aiAnswer}
          </div>
        )}
      </Card>

      {/* フィルター */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            className="pl-9"
            placeholder="キーワード検索..."
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
          />
        </div>
        <Select
          className="w-40"
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          options={FILTER_CATEGORY_OPTIONS}
        />
      </div>

      {error && (
        <ErrorBanner />
      )}

      {isLoading ? (
        <Card className="text-center py-16">
          <Skeleton className="h-10 w-full mb-4" />
          <Skeleton className="h-10 w-full mb-4" />
          <Skeleton className="h-10 w-full" />
        </Card>
      ) : filtered.length === 0 ? (
        <Card className="text-center py-16 text-gray-400">
          <BookOpen className="w-12 h-12 mx-auto mb-3" />
          <p className="text-lg font-medium">記事が見つかりません</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((article: KnowledgeArticle) => {
            const tags = article.tags ? article.tags.split(",").map((t) => t.trim()).filter(Boolean) : [];
            return (
              <Card
                key={article.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => setSelectedArticle(article)}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="info">{CATEGORY_LABEL[article.category] ?? article.category}</Badge>
                    {!article.is_published && (
                      <Badge variant="warning">非公開</Badge>
                    )}
                  </div>
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2 line-clamp-2">{article.title}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mb-3">{article.content}</p>
                <div className="flex items-center gap-4 text-xs text-gray-400 dark:text-gray-500">
                  <span className="flex items-center gap-1">
                    <Eye className="w-3 h-3" />
                    {article.view_count}
                  </span>
                  {article.rating != null && (
                    <span className="flex items-center gap-1 text-yellow-500">
                      <Star className="w-3 h-3 fill-yellow-400" />
                      {article.rating.toFixed(1)}
                    </span>
                  )}
                  {tags.map((tag) => (
                    <span key={tag} className="bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full text-gray-500 dark:text-gray-400">
                      #{tag}
                    </span>
                  ))}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* 記事詳細・編集モーダル */}
      <Modal
        open={!!selectedArticle}
        onClose={() => { setSelectedArticle(null); setIsEditMode(false); }}
        title=""
        size="lg"
      >
        {selectedArticle && (
          <>
            <div className="mb-4">
              {isEditMode ? (
                <Input
                  className="text-xl font-semibold w-full"
                  value={editForm.title}
                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                />
              ) : (
                <>
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <Badge variant="info">
                      {CATEGORY_LABEL[selectedArticle.category] ?? selectedArticle.category}
                    </Badge>
                    {!selectedArticle.is_published && (
                      <Badge variant="warning">非公開</Badge>
                    )}
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white">{selectedArticle.title}</h3>
                  <div className="flex items-center gap-4 text-xs text-gray-400 dark:text-gray-500 mt-1">
                    <span className="flex items-center gap-1">
                      <Eye className="w-3 h-3" />
                      閲覧数: {selectedArticle.view_count}
                    </span>
                    {selectedArticle.rating != null && (
                      <span className="flex items-center gap-1 text-yellow-500">
                        <Star className="w-3 h-3 fill-yellow-400" />
                        評価: {selectedArticle.rating.toFixed(1)}
                      </span>
                    )}
                  </div>
                </>
              )}
            </div>
            <div className="flex-1 overflow-y-auto">
              {isEditMode ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField label="カテゴリ" htmlFor="edit_category">
                      <Select
                        id="edit_category"
                        value={editForm.category}
                        onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                        options={CATEGORY_OPTIONS}
                      />
                    </FormField>
                    <FormField label="タグ（カンマ区切り）" htmlFor="edit_tags">
                      <Input
                        id="edit_tags"
                        value={editForm.tags ?? ""}
                        onChange={(e) => setEditForm({ ...editForm, tags: e.target.value })}
                        placeholder="施工, 安全, ..."
                      />
                    </FormField>
                  </div>
                  <FormField label="内容" htmlFor="edit_content">
                    <Textarea
                      id="edit_content"
                      rows={10}
                      value={editForm.content}
                      onChange={(e) => setEditForm({ ...editForm, content: e.target.value })}
                    />
                  </FormField>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="edit_is_published"
                      checked={editForm.is_published}
                      onChange={(e) => setEditForm({ ...editForm, is_published: e.target.checked })}
                    />
                    <label htmlFor="edit_is_published" className="text-sm font-medium text-gray-700 dark:text-gray-300">公開する</label>
                  </div>
                  {updateMutation.isError && (
                    <ErrorText message="保存に失敗しました。" />
                  )}
                </div>
              ) : (
                <>
                  <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                    {selectedArticle.content}
                  </div>
                  {selectedArticle.tags && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {selectedArticle.tags.split(",").map((t) => t.trim()).filter(Boolean).map((tag) => (
                        <span key={tag} className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-full text-xs text-gray-500 dark:text-gray-400">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
            <div className="flex items-center justify-between pt-4 border-t dark:border-gray-600 mt-4">
              <Button
                variant="danger"
                size="sm"
                leftIcon={<Trash2 className="w-4 h-4" />}
                onClick={() => handleDelete(selectedArticle)}
                loading={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? "削除中..." : "削除"}
              </Button>
              <div className="flex gap-3">
                {isEditMode ? (
                  <>
                    <Button
                      variant="secondary"
                      onClick={() => setIsEditMode(false)}
                      loading={updateMutation.isPending}
                    >
                      キャンセル
                    </Button>
                    <Button
                      variant="primary"
                      onClick={() => updateMutation.mutate({ id: selectedArticle.id, data: editForm })}
                      loading={updateMutation.isPending}
                    >
                      {updateMutation.isPending ? "保存中..." : "保存"}
                    </Button>
                  </>
                ) : (
                  <Button
                    variant="secondary"
                    leftIcon={<Pencil className="w-4 h-4" />}
                    onClick={() => openEditMode(selectedArticle)}
                  >
                    編集
                  </Button>
                )}
              </div>
            </div>
          </>
        )}
      </Modal>

      {/* 記事作成モーダル */}
      <Modal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title=""
        size="lg"
      >
        <h3 className="text-lg font-semibold mb-4">新規記事作成</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormField label="タイトル" htmlFor="create_title" required>
            <Input id="create_title" value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })} required />
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="カテゴリ" htmlFor="create_category">
              <Select id="create_category" value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                options={CATEGORY_OPTIONS}
              />
            </FormField>
            <FormField label="タグ（カンマ区切り）" htmlFor="create_tags">
              <Input id="create_tags" value={form.tags ?? ""}
                onChange={(e) => setForm({ ...form, tags: e.target.value })}
                placeholder="施工, 安全, ..." />
            </FormField>
          </div>
          <FormField label="内容" htmlFor="create_content" required>
            <Textarea id="create_content" rows={8} value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })} required />
          </FormField>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="is_published" checked={form.is_published}
              onChange={(e) => setForm({ ...form, is_published: e.target.checked })} />
            <label htmlFor="is_published" className="text-sm font-medium text-gray-700 dark:text-gray-300">公開する</label>
          </div>
          {createMutation.isError && (
            <ErrorText message="作成に失敗しました。" />
          )}
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setShowCreateModal(false)}>
              キャンセル
            </Button>
            <Button type="submit" variant="primary" loading={createMutation.isPending}>
              {createMutation.isPending ? "作成中..." : "作成"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
