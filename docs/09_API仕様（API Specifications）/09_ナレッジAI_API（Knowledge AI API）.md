# ナレッジ・AI API仕様

## 概要
ナレッジ管理とAI支援機能（GPT-4o統合）に関するAPI仕様を定義する。

## エンドポイント一覧

| メソッド | エンドポイント | 説明 | 権限 |
|---------|-------------|------|------|
| GET | /knowledge/articles | ナレッジ記事一覧 | knowledge:read |
| POST | /knowledge/articles | ナレッジ記事作成 | knowledge:write |
| GET | /knowledge/articles/{id} | 記事詳細 | knowledge:read |
| PUT | /knowledge/articles/{id} | 記事更新 | knowledge:write |
| DELETE | /knowledge/articles/{id} | 記事削除 | knowledge:delete |
| POST | /knowledge/search | ナレッジ検索 | knowledge:read |
| POST | /ai/chat | AI会話 | ai:use |
| POST | /ai/summarize | テキスト要約 | ai:use |
| POST | /ai/analyze-photo | 写真AI分析 | ai:use |
| POST | /ai/generate-report | レポート自動生成 | ai:use |
| GET | /ai/usage | AI利用統計 | ai:admin |

## POST /knowledge/search

Elasticsearchを使った全文検索エンドポイント。

### リクエスト
```json
{
  "query": "コンクリート打設 品質管理",
  "filters": {
    "category": ["施工管理", "品質"],
    "tags": ["コンクリート"],
    "date_from": "2025-01-01"
  },
  "page": 1,
  "per_page": 10,
  "highlight": true
}
```

### レスポンス
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": 45,
        "title": "コンクリート打設時の品質管理チェックポイント",
        "category": "施工管理",
        "summary": "打設前・打設中・養生期間の品質管理手順",
        "highlight": "...コンクリート<em>打設</em>時には<em>品質管理</em>の観点から...",
        "score": 0.95,
        "tags": ["コンクリート", "品質管理", "施工"],
        "view_count": 234,
        "updated_at": "2026-03-15T10:00:00+09:00"
      }
    ],
    "pagination": { "total": 23, "page": 1, "per_page": 10 }
  }
}
```

## POST /ai/chat

GPT-4oによるコンストラクション特化AIアシスタント。

### リクエスト
```json
{
  "messages": [
    {
      "role": "user",
      "content": "コンクリートの打設後、養生期間はどのくらい必要ですか？"
    }
  ],
  "context": {
    "project_id": 1,
    "include_knowledge_base": true
  },
  "max_tokens": 500,
  "temperature": 0.3
}
```

### レスポンス
```json
{
  "success": true,
  "data": {
    "message": {
      "role": "assistant",
      "content": "コンクリートの養生期間は以下の通りです：\n\n**普通ポルトランドセメント使用時**\n- 最低養生期間: 5日間（日平均気温15°C以上の場合）\n- 推奨養生期間: 7〜14日間\n\n**冬季（気温5°C以下）**\n- 保温養生が必要\n- 最低14日間以上"
    },
    "sources": [
      {
        "article_id": 45,
        "title": "コンクリート養生管理マニュアル",
        "relevance": 0.92
      }
    ],
    "model": "gpt-4o",
    "tokens": {
      "prompt": 245,
      "completion": 178,
      "total": 423
    },
    "session_id": "chat-session-uuid"
  }
}
```

## POST /ai/generate-report

AIによる定型報告書の自動生成。

### リクエスト
```json
{
  "report_type": "monthly_progress",
  "project_id": 1,
  "period": "2026-04",
  "include_sections": [
    "executive_summary",
    "progress_details",
    "safety_summary",
    "cost_summary",
    "next_month_plan"
  ],
  "output_format": "markdown"
}
```

### レスポンス
```json
{
  "success": true,
  "data": {
    "report_id": "report-uuid",
    "title": "2026年4月 工事進捗報告書",
    "content": "# 2026年4月 工事進捗報告書\n\n## エグゼクティブサマリー\n...",
    "word_count": 1250,
    "model": "gpt-4o",
    "generated_at": "2026-04-15T19:00:00+09:00",
    "download_url": "/api/v1/reports/report-uuid/download"
  }
}
```

## AI利用制限とコスト管理

| 機能 | レート制限 | 月間上限トークン |
|------|----------|--------------|
| AIチャット | 30回/分/ユーザー | 500,000トークン |
| 日報要約 | 自動（制限なし） | - |
| 写真分析 | 20回/日/ユーザー | - |
| レポート生成 | 10回/日/プロジェクト | - |

## Elasticsearch 検索インデックス設定

```json
{
  "mappings": {
    "properties": {
      "title": {"type": "text", "analyzer": "kuromoji"},
      "content": {"type": "text", "analyzer": "kuromoji"},
      "tags": {"type": "keyword"},
      "category": {"type": "keyword"},
      "created_at": {"type": "date"}
    }
  }
}
```
