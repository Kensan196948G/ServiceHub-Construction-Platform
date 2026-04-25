# 工事案件管理ガイド

工事案件（Construction Project）の作成・更新・ステータス管理の基本操作を説明します。

## 画面構成

| 画面 | URL | 説明 |
|---|---|---|
| 案件一覧 | `/projects` | 案件の検索・フィルター・ページネーション |
| 案件詳細 | `/projects/{id}` | 案件情報・日報・コスト・安全確認 |

## 1. 案件を作成する

### 必須項目

| フィールド | 説明 | 例 |
|---|---|---|
| 案件名 | プロジェクト名称 | `渋谷ビル改修工事` |
| 案件コード | 一意の識別コード | `PRJ-2026-001` |
| ステータス | 初期値は `active` | `active` |
| 予算 | 税込金額（円） | `50000000` |

### API での作成

```http
POST /api/v1/projects/
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "name": "渋谷ビル改修工事",
  "project_code": "PRJ-2026-001",
  "status": "active",
  "budget": 50000000
}
```

レスポンス:
```json
{
  "id": 1,
  "name": "渋谷ビル改修工事",
  "project_code": "PRJ-2026-001",
  "status": "active",
  "budget": 50000000
}
```

## 2. ステータスの遷移

```
planning → active → on_hold → completed
                  ↘ cancelled
```

| ステータス | 意味 | 遷移可能先 |
|---|---|---|
| `planning` | 計画中 | `active`, `cancelled` |
| `active` | 工事中 | `on_hold`, `completed`, `cancelled` |
| `on_hold` | 一時停止 | `active`, `cancelled` |
| `completed` | 完了 | (変更不可) |
| `cancelled` | 中止 | (変更不可) |

> **権限**: ステータス変更は `PROJECT_MANAGER` 以上のロールが必要です。

## 3. 案件一覧を検索・フィルターする

```http
GET /api/v1/projects/?status=active&page=1&page_size=20
Authorization: Bearer {access_token}
```

| パラメータ | 説明 | デフォルト |
|---|---|---|
| `status` | ステータスでフィルター | (全て) |
| `search` | 案件名のキーワード検索 | (なし) |
| `page` | ページ番号 | `1` |
| `page_size` | 1ページの件数 | `20` (最大 `100`) |

## 4. 日報を記録する

案件詳細画面の「日報」タブから記録します。

```http
POST /api/v1/daily-reports/
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "project_id": 1,
  "report_date": "2026-04-25",
  "weather": "晴",
  "workers_count": 15,
  "content": "基礎工事完了。明日から上棟予定。"
}
```

## 5. 原価を記録する

```http
POST /api/v1/costs/
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "project_id": 1,
  "category": "materials",
  "amount": 1500000,
  "description": "鉄骨材料費",
  "occurred_at": "2026-04-25"
}
```

予実対比サマリーの確認:
```http
GET /api/v1/costs/summary/{project_id}
```

## 6. 安全確認チェックリストを使う

```http
POST /api/v1/safety/checks
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "project_id": 1,
  "check_date": "2026-04-25",
  "items": [
    {"category": "足場安全", "checked": true, "note": ""},
    {"category": "KY活動", "checked": true, "note": "実施済み"}
  ]
}
```

## 関連ガイド

- [はじめに](getting-started.md) — 環境構築
- [管理者設定ガイド](admin-guide.md) — ユーザー・権限管理
