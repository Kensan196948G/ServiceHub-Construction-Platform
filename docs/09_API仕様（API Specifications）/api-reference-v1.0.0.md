# API リファレンス v1.0.0

> ServiceHub Construction Platform — REST API 完全仕様  
> ベースURL: `http://localhost:8888`（ローカル開発）  
> API プレフィックス: `/api/v1`

---

## 目次

1. [認証方式](#認証方式)
2. [ロール一覧](#ロール一覧)
3. [レスポンス形式](#レスポンス形式)
4. [エンドポイント一覧](#エンドポイント一覧)
   - [システム](#システム)
   - [認証 (Auth)](#認証-auth)
   - [工事案件管理 (Projects)](#工事案件管理-projects)
   - [日報管理 (Daily Reports)](#日報管理-daily-reports)
   - [写真・資料管理 (Photos)](#写真資料管理-photos)
   - [安全・品質管理 (Safety/Quality)](#安全品質管理-safetyquality)
   - [原価・工数管理 (Costs)](#原価工数管理-costs)
   - [ITSM管理 (ITSM)](#itsm管理-itsm)
   - [ナレッジ管理 (Knowledge)](#ナレッジ管理-knowledge)

---

## 認証方式

| 項目 | 内容 |
|------|------|
| 方式 | JWT Bearer Token（HS256） |
| アクセストークン有効期限 | 15分 |
| リフレッシュトークン有効期限 | 7日 |
| ヘッダー | `Authorization: Bearer <access_token>` |

---

## ロール一覧

| ロール | 識別子 | 権限概要 |
|--------|--------|----------|
| 管理者 | `ADMIN` | 全機能フルアクセス・承認権限 |
| プロジェクトマネージャー | `PROJECT_MANAGER` | 案件・日報・写真・コスト・ナレッジ管理 |
| 現場監督 | `SITE_SUPERVISOR` | 日報・写真・安全品質管理 |
| コスト管理者 | `COST_MANAGER` | 原価・工数管理 |
| IT運用担当者 | `IT_OPERATOR` | ITSM・ナレッジ管理 |
| 閲覧者 | `VIEWER` | 読み取りのみ |

---

## レスポンス形式

### 単一リソース (`ApiResponse`)

```json
{
  "data": { ... },
  "message": "操作が完了しました"
}
```

### ページネーション (`PaginatedResponse`)

```json
{
  "data": [ ... ],
  "pagination": {
    "total": 100,
    "page": 1,
    "per_page": 20,
    "total_pages": 5
  }
}
```

### エラーレスポンス

```json
{
  "detail": "エラーメッセージ"
}
```

| HTTPステータス | 意味 |
|----------------|------|
| 200 | 成功 |
| 201 | 作成成功 |
| 204 | 削除成功（レスポンスボディなし） |
| 400 | バリデーションエラー |
| 401 | 認証エラー（トークン無効/期限切れ） |
| 403 | 権限エラー（ロール不足） |
| 404 | リソースが見つからない |
| 422 | リクエスト形式エラー |
| 500 | サーバーエラー |

---

## エンドポイント一覧

### システム

| # | メソッド | パス | 説明 | 認証 | ロール制限 |
|---|----------|------|------|------|-----------|
| 1 | GET | `/health` | ヘルスチェック | 不要 | なし |
| 2 | GET | `/api/v1/status` | APIステータス取得 | 不要 | なし |

### 認証 (Auth)

| # | メソッド | パス | 説明 | 認証 | ロール制限 |
|---|----------|------|------|------|-----------|
| 3 | POST | `/api/v1/auth/login` | ログイン（JWT発行） | 不要 | なし |
| 4 | POST | `/api/v1/auth/refresh` | アクセストークン更新 | 不要（リフレッシュトークン使用） | なし |
| 5 | GET | `/api/v1/auth/me` | 現在ユーザー情報取得 | 必要 | 全ロール |
| 6 | POST | `/api/v1/auth/logout` | ログアウト | 必要 | 全ロール |

#### POST /api/v1/auth/login — リクエスト例

```json
{
  "email": "admin@example.com",
  "password": "Admin1234!"
}
```

#### POST /api/v1/auth/login — レスポンス例

```json
{
  "access_token": "eyJhbGci...",
  "refresh_token": "eyJhbGci...",
  "expires_in": 900
}
```

---

### 工事案件管理 (Projects)

| # | メソッド | パス | 説明 | 認証 | ロール制限 |
|---|----------|------|------|------|-----------|
| 7 | GET | `/api/v1/projects` | 案件一覧取得（ページネーション） | 必要 | 全ロール |
| 8 | POST | `/api/v1/projects` | 案件作成 | 必要 | ADMIN / PROJECT_MANAGER |
| 9 | GET | `/api/v1/projects/{project_id}` | 案件詳細取得 | 必要 | 全ロール |
| 10 | PUT | `/api/v1/projects/{project_id}` | 案件更新 | 必要 | ADMIN / PROJECT_MANAGER |
| 11 | DELETE | `/api/v1/projects/{project_id}` | 案件削除（論理削除） | 必要 | ADMIN のみ |

#### POST /api/v1/projects — リクエスト例

```json
{
  "name": "○○ビル新築工事",
  "project_code": "PRJ-2026-001",
  "status": "active",
  "client_name": "○○建設株式会社",
  "start_date": "2026-04-01",
  "end_date": "2026-12-31",
  "budget": 50000000
}
```

---

### 日報管理 (Daily Reports)

| # | メソッド | パス | 説明 | 認証 | ロール制限 |
|---|----------|------|------|------|-----------|
| 12 | GET | `/api/v1/projects/{project_id}/daily-reports` | プロジェクト別日報一覧 | 必要 | ADMIN / PROJECT_MANAGER / SITE_SUPERVISOR |
| 13 | POST | `/api/v1/projects/{project_id}/daily-reports` | 日報作成 | 必要 | ADMIN / PROJECT_MANAGER / SITE_SUPERVISOR |
| 14 | GET | `/api/v1/daily-reports/{report_id}` | 日報詳細取得 | 必要 | ADMIN / PROJECT_MANAGER / SITE_SUPERVISOR |
| 15 | PUT | `/api/v1/daily-reports/{report_id}` | 日報更新 | 必要 | ADMIN / PROJECT_MANAGER / SITE_SUPERVISOR |
| 16 | DELETE | `/api/v1/daily-reports/{report_id}` | 日報削除 | 必要 | ADMIN / PROJECT_MANAGER / SITE_SUPERVISOR |

---

### 写真・資料管理 (Photos)

| # | メソッド | パス | 説明 | 認証 | ロール制限 |
|---|----------|------|------|------|-----------|
| 17 | POST | `/api/v1/projects/{project_id}/photos` | 写真アップロード（multipart/form-data） | 必要 | ADMIN / PROJECT_MANAGER / SITE_SUPERVISOR |
| 18 | GET | `/api/v1/projects/{project_id}/photos` | プロジェクト別写真一覧 | 必要 | ADMIN / PROJECT_MANAGER / SITE_SUPERVISOR / VIEWER |
| 19 | GET | `/api/v1/photos/{photo_id}` | 写真詳細・プリサインドURL取得 | 必要 | ADMIN / PROJECT_MANAGER / SITE_SUPERVISOR / VIEWER |
| 20 | PUT | `/api/v1/photos/{photo_id}` | 写真メタデータ更新 | 必要 | ADMIN / PROJECT_MANAGER / SITE_SUPERVISOR |
| 21 | DELETE | `/api/v1/photos/{photo_id}` | 写真削除 | 必要 | ADMIN / PROJECT_MANAGER |

#### アップロード制限

| 項目 | 制限 |
|------|------|
| 許可ファイル形式 | JPEG / PNG / WebP / PDF |
| 最大ファイルサイズ | 50 MB |
| ストレージ | MinIO（S3互換） |

---

### 安全・品質管理 (Safety/Quality)

| # | メソッド | パス | 説明 | 認証 | ロール制限 |
|---|----------|------|------|------|-----------|
| 22 | POST | `/api/v1/projects/{project_id}/safety-checks` | 安全確認チェックリスト作成 | 必要 | ADMIN / PROJECT_MANAGER / SITE_SUPERVISOR |
| 23 | GET | `/api/v1/projects/{project_id}/safety-checks` | 安全確認一覧取得 | 必要 | ADMIN / PROJECT_MANAGER / SITE_SUPERVISOR |
| 24 | POST | `/api/v1/projects/{project_id}/quality-inspections` | 品質検査記録作成 | 必要 | ADMIN / PROJECT_MANAGER / SITE_SUPERVISOR |
| 25 | GET | `/api/v1/projects/{project_id}/quality-inspections` | 品質検査一覧取得 | 必要 | ADMIN / PROJECT_MANAGER / SITE_SUPERVISOR |

---

### 原価・工数管理 (Costs)

| # | メソッド | パス | 説明 | 認証 | ロール制限 |
|---|----------|------|------|------|-----------|
| 26 | POST | `/api/v1/projects/{project_id}/cost-records` | コスト記録作成 | 必要 | ADMIN / PROJECT_MANAGER / COST_MANAGER |
| 27 | GET | `/api/v1/projects/{project_id}/cost-records` | コスト記録一覧取得 | 必要 | ADMIN / PROJECT_MANAGER / COST_MANAGER |
| 28 | GET | `/api/v1/projects/{project_id}/cost-summary` | 予実対比サマリー取得 | 必要 | ADMIN / PROJECT_MANAGER / COST_MANAGER |
| 29 | POST | `/api/v1/projects/{project_id}/work-hours` | 工数記録作成 | 必要 | ADMIN / PROJECT_MANAGER / SITE_SUPERVISOR |

#### GET /api/v1/projects/{project_id}/cost-summary — レスポンス例

```json
{
  "data": {
    "total_budgeted": 50000000,
    "total_actual": 12500000,
    "total_variance": 37500000,
    "by_category": [
      {
        "category": "材料費",
        "budgeted": 20000000,
        "actual": 5000000,
        "variance": 15000000
      }
    ]
  }
}
```

---

### ITSM管理 (ITSM)

| # | メソッド | パス | 説明 | 認証 | ロール制限 |
|---|----------|------|------|------|-----------|
| 30 | POST | `/api/v1/itsm/incidents` | インシデント起票（INC番号自動採番） | 必要 | ADMIN / IT_OPERATOR / PROJECT_MANAGER |
| 31 | GET | `/api/v1/itsm/incidents` | インシデント一覧取得 | 必要 | ADMIN / IT_OPERATOR / PROJECT_MANAGER |
| 32 | GET | `/api/v1/itsm/incidents/{incident_id}` | インシデント詳細取得 | 必要 | ADMIN / IT_OPERATOR / PROJECT_MANAGER |
| 33 | PATCH | `/api/v1/itsm/incidents/{incident_id}` | インシデント更新・解決 | 必要 | ADMIN / IT_OPERATOR / PROJECT_MANAGER |
| 34 | POST | `/api/v1/itsm/changes` | 変更要求起票（CHG番号自動採番）[SoD] | 必要 | ADMIN / IT_OPERATOR |
| 35 | GET | `/api/v1/itsm/changes` | 変更要求一覧取得 | 必要 | ADMIN / IT_OPERATOR / PROJECT_MANAGER |
| 36 | PATCH | `/api/v1/itsm/changes/{change_id}/approve` | 変更承認【SoD: 起票者とは別人】 | 必要 | ADMIN のみ |

> **SoD（職務分離）**: 変更要求の起票（IT_OPERATOR）と承認（ADMIN）は必ず別ロールが担当。  
> 採番形式: `INC-YYYYMMDD-XXXXXX` / `CHG-YYYYMMDD-XXXXXX`

---

### ナレッジ管理 (Knowledge)

| # | メソッド | パス | 説明 | 認証 | ロール制限 |
|---|----------|------|------|------|-----------|
| 37 | POST | `/api/v1/knowledge/articles` | ナレッジ記事作成 | 必要 | ADMIN / PROJECT_MANAGER / IT_OPERATOR |
| 38 | GET | `/api/v1/knowledge/articles` | 記事一覧取得（キーワード検索対応） | 必要 | 全ロール |
| 39 | GET | `/api/v1/knowledge/articles/{article_id}` | 記事詳細取得（閲覧カウント+1） | 必要 | 全ロール |
| 40 | PATCH | `/api/v1/knowledge/articles/{article_id}` | 記事更新 | 必要 | ADMIN / PROJECT_MANAGER / IT_OPERATOR |
| 41 | DELETE | `/api/v1/knowledge/articles/{article_id}` | 記事削除（論理削除） | 必要 | ADMIN / PROJECT_MANAGER / IT_OPERATOR |
| 42 | POST | `/api/v1/knowledge/search` | AI検索（OpenAI gpt-4o-mini / フォールバック: キーワード検索） | 必要 | 全ロール |

#### POST /api/v1/knowledge/search — リクエスト例

```json
{
  "query": "足場設置の安全基準について教えてください"
}
```

#### POST /api/v1/knowledge/search — レスポンス例

```json
{
  "answer": "足場設置に関する安全基準は...",
  "articles": [ ... ],
  "model_used": "gpt-4o-mini"
}
```

---

## エンドポイント集計

| カテゴリ | エンドポイント数 |
|----------|----------------|
| システム | 2 |
| 認証 | 4 |
| 工事案件管理 | 5 |
| 日報管理 | 5 |
| 写真・資料管理 | 5 |
| 安全・品質管理 | 4 |
| 原価・工数管理 | 4 |
| ITSM管理 | 7 |
| ナレッジ管理 | 6 |
| **合計** | **42** |

---

## 関連ドキュメント

- [認証認可設計](../06_セキュリティ（Security）/02_認証認可設計（Auth Design）.md)
- [セキュリティ概要](../06_セキュリティ（Security）/security-overview-v1.0.0.md)
- [ローカル開発ガイド](../05_運用設計（Operations Design）/local-development-guide.md)
