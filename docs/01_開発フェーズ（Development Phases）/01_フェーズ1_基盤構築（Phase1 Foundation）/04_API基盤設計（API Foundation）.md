# API基盤設計

## 概要

本ドキュメントでは、ServiceHub Construction Platform のREST API基盤の設計方針を説明する。FastAPIフレームワークを使用し、OpenAPI仕様に基づいた堅牢なAPIを提供する。

---

## API設計方針

| 原則 | 内容 |
|-----|------|
| RESTful | リソース中心の設計、HTTPメソッドの適切な使用 |
| バージョニング | URLパスによるバージョン管理（/api/v1/） |
| 一貫性 | レスポンス形式の統一、エラーコードの標準化 |
| セキュリティ | 全エンドポイントでJWT認証、RBAC適用 |
| ドキュメント | OpenAPI (Swagger) による自動ドキュメント生成 |
| パフォーマンス | ページネーション、フィルタリング、キャッシュ戦略 |

---

## 技術スタック

| 項目 | 技術 | バージョン |
|-----|------|---------|
| フレームワーク | FastAPI | 0.110.x |
| 非同期処理 | asyncio + uvicorn | - |
| バリデーション | Pydantic v2 | 2.6.x |
| ORM | SQLAlchemy | 2.0.x |
| APIドキュメント | OpenAPI 3.1 / Swagger UI | - |
| テスト | pytest + httpx | - |

---

## URLバージョニング戦略

```
https://api.servicehub.internal/api/v1/projects
https://api.servicehub.internal/api/v2/projects  # 将来のバージョン
```

### バージョン移行方針
- 破壊的変更がある場合のみバージョンアップ
- 旧バージョンは最低6ヶ月間並行サポート
- 廃止予定バージョンは `Deprecation` ヘッダーで通知

---

## エンドポイント命名規則

```
GET    /api/v1/projects              # 一覧取得
POST   /api/v1/projects              # 新規作成
GET    /api/v1/projects/{id}         # 個別取得
PUT    /api/v1/projects/{id}         # 全体更新
PATCH  /api/v1/projects/{id}         # 部分更新
DELETE /api/v1/projects/{id}         # 削除
GET    /api/v1/projects/{id}/reports # ネストリソース
```

---

## 共通レスポンス形式

### 成功レスポンス

```json
{
  "status": "success",
  "data": { ... },
  "meta": {
    "page": 1,
    "per_page": 20,
    "total": 150,
    "total_pages": 8
  },
  "timestamp": "2026-04-15T10:30:00Z"
}
```

### エラーレスポンス

```json
{
  "status": "error",
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "入力値が不正です",
    "details": [
      {
        "field": "start_date",
        "message": "開始日は終了日より前である必要があります"
      }
    ]
  },
  "timestamp": "2026-04-15T10:30:00Z",
  "request_id": "req_abc123"
}
```

---

## エラーコード定義

| HTTPステータス | エラーコード | 説明 |
|-------------|----------|------|
| 400 | VALIDATION_ERROR | バリデーションエラー |
| 401 | UNAUTHORIZED | 認証エラー |
| 403 | FORBIDDEN | 権限エラー |
| 404 | NOT_FOUND | リソース未発見 |
| 409 | CONFLICT | データ競合 |
| 422 | UNPROCESSABLE_ENTITY | 処理不可能なエンティティ |
| 429 | RATE_LIMIT_EXCEEDED | レートリミット超過 |
| 500 | INTERNAL_SERVER_ERROR | サーバー内部エラー |
| 503 | SERVICE_UNAVAILABLE | サービス利用不可 |

---

## ページネーション設計

```
GET /api/v1/projects?page=1&per_page=20&sort=created_at&order=desc
```

| パラメータ | デフォルト | 最大値 | 説明 |
|---------|---------|-------|------|
| page | 1 | - | ページ番号 |
| per_page | 20 | 100 | 1ページあたり件数 |
| sort | created_at | - | ソートフィールド |
| order | desc | - | asc/desc |

---

## レート制限設計

| エンドポイント種別 | 制限 | 時間窓 |
|---------------|------|-------|
| 一般API | 100リクエスト | 1分 |
| 認証API | 10リクエスト | 1分 |
| ファイルアップロード | 20リクエスト | 1分 |
| AI/LLM API | 30リクエスト | 1分 |

---

## セキュリティヘッダー

```python
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.middleware.httpsredirect import HTTPSRedirectMiddleware

app.add_middleware(TrustedHostMiddleware, allowed_hosts=["*.servicehub.internal"])

@app.middleware("http")
async def add_security_headers(request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    response.headers["Content-Security-Policy"] = "default-src 'self'"
    return response
```

---

## プロジェクト構造

```
backend/
├── app/
│   ├── main.py                 # FastAPIアプリケーションエントリポイント
│   ├── core/
│   │   ├── config.py           # 設定管理
│   │   ├── security.py         # 認証・認可
│   │   └── database.py         # DB接続
│   ├── api/
│   │   └── v1/
│   │       ├── auth/           # 認証API
│   │       ├── projects/       # 案件管理API
│   │       ├── daily_reports/  # 日報管理API
│   │       ├── photos/         # 写真管理API
│   │       ├── safety/         # 安全品質API
│   │       ├── costs/          # 原価管理API
│   │       ├── itsm/           # ITSM API
│   │       └── knowledge/      # ナレッジ・AI API
│   ├── models/                 # SQLAlchemyモデル
│   ├── schemas/                # Pydanticスキーマ
│   ├── services/               # ビジネスロジック
│   └── tests/                  # テストコード
└── alembic/                    # DBマイグレーション
```
