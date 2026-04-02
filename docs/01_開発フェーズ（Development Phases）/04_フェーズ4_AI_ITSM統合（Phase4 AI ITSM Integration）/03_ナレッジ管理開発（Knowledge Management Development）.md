# ナレッジ管理 開発設計

## 概要

ナレッジ管理モジュールは、建設現場における暗黙知を形式知化し、組織全体で共有・活用するための基盤を提供する。Elasticsearchを活用した高速全文検索、カテゴリ・タグによる体系的な整理、閲覧制御による情報セキュリティを実現する。

---

## 機能一覧

| 機能ID | 機能名 | 優先度 | 説明 |
|-------|-------|--------|------|
| KM-001 | ナレッジ記事作成 | 高 | Markdownエディタでの記事作成 |
| KM-002 | 記事承認フロー | 高 | 作成→レビュー→承認の審査フロー |
| KM-003 | 全文検索 | 高 | Elasticsearchによる日本語全文検索 |
| KM-004 | カテゴリ管理 | 高 | 階層型カテゴリによる分類 |
| KM-005 | タグ管理 | 中 | フリータグによる横断的分類 |
| KM-006 | 閲覧制御 | 高 | RBACによるカテゴリ・記事単位のアクセス制御 |
| KM-007 | バージョン管理 | 中 | 記事の改訂履歴管理 |
| KM-008 | 関連記事推薦 | 中 | AI による関連記事の自動推薦 |
| KM-009 | 評価・フィードバック | 低 | 記事の有用性評価（いいね・コメント） |
| KM-010 | ナレッジ統計 | 低 | 閲覧数・検索クエリ分析 |

---

## Elasticsearch インデックス設計

```json
{
  "settings": {
    "analysis": {
      "analyzer": {
        "japanese": {
          "type": "custom",
          "tokenizer": "kuromoji_tokenizer",
          "filter": ["kuromoji_baseform", "lowercase", "cjk_width"]
        }
      }
    }
  },
  "mappings": {
    "properties": {
      "id": {"type": "keyword"},
      "title": {
        "type": "text",
        "analyzer": "japanese",
        "fields": {"keyword": {"type": "keyword"}}
      },
      "content": {
        "type": "text",
        "analyzer": "japanese"
      },
      "category": {"type": "keyword"},
      "tags": {"type": "keyword"},
      "author_id": {"type": "keyword"},
      "created_at": {"type": "date"},
      "view_count": {"type": "integer"},
      "is_published": {"type": "boolean"}
    }
  }
}
```

---

## データモデル

### knowledge.articles テーブル

```sql
CREATE TABLE knowledge.articles (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title           VARCHAR(300) NOT NULL,
    content         TEXT NOT NULL,              -- Markdown形式
    content_html    TEXT,                       -- レンダリング済みHTML
    category_id     UUID REFERENCES knowledge.categories(id),
    author_id       UUID REFERENCES auth.users(id),
    status          VARCHAR(50) NOT NULL DEFAULT 'draft',
    version         INTEGER NOT NULL DEFAULT 1,
    is_published    BOOLEAN NOT NULL DEFAULT FALSE,
    view_count      INTEGER NOT NULL DEFAULT 0,
    published_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### knowledge.categories テーブル

```sql
CREATE TABLE knowledge.categories (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(100) NOT NULL,
    parent_id   UUID REFERENCES knowledge.categories(id),
    description TEXT,
    sort_order  INTEGER NOT NULL DEFAULT 0,
    access_level VARCHAR(50) NOT NULL DEFAULT 'all'
);
```

---

## カテゴリ体系（建設業向け）

```
ナレッジベース
├── 工事管理
│   ├── 施工計画
│   ├── 品質管理
│   └── 安全管理
├── 技術資料
│   ├── 工法・施工要領
│   ├── 材料・仕様
│   └── 機器・工具
├── 法規・基準
│   ├── 建設基準法
│   ├── 安全衛生法規
│   └── 品質規格（JIS等）
├── 障害対応
│   ├── トラブルシューティング
│   └── 過去のインシデント事例
└── 研修・教育
    ├── 新人向け資料
    └── 技術研修資料
```

---

## 全文検索 API 設計

```python
from elasticsearch import AsyncElasticsearch

async def search_knowledge(
    query: str,
    categories: list[str] = None,
    tags: list[str] = None,
    page: int = 1,
    per_page: int = 20
) -> dict:
    """ナレッジ全文検索"""
    
    must_queries = [
        {
            "multi_match": {
                "query": query,
                "fields": ["title^3", "content^1"],
                "analyzer": "japanese"
            }
        }
    ]
    
    filter_queries = [{"term": {"is_published": True}}]
    
    if categories:
        filter_queries.append({"terms": {"category": categories}})
    if tags:
        filter_queries.append({"terms": {"tags": tags}})
    
    body = {
        "query": {
            "bool": {
                "must": must_queries,
                "filter": filter_queries
            }
        },
        "highlight": {
            "fields": {"content": {}, "title": {}}
        },
        "from": (page - 1) * per_page,
        "size": per_page
    }
    
    es = AsyncElasticsearch([settings.ELASTICSEARCH_URL])
    result = await es.search(index="knowledge_articles", body=body)
    return result
```

---

## ナレッジ統計・分析

| 指標 | 収集方法 | 活用目的 |
|-----|---------|---------|
| 記事閲覧数 | ページビューログ | 人気記事の把握 |
| 検索クエリ | Elasticsearchクエリログ | ヒットしない検索語の把握 |
| 検索結果クリック率 | フロントエンドイベント | 検索品質の評価 |
| 役に立った評価 | ユーザー評価API | 記事品質の改善 |
