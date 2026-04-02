# 🗂️ 案件管理API（Project Management API）

## エンドポイント一覧

| メソッド | パス | 説明 | 権限 |
|--------|------|------|------|
| GET | `/api/v1/projects` | 案件一覧 | 全ロール |
| POST | `/api/v1/projects` | 案件作成 | PM以上 |
| GET | `/api/v1/projects/{id}` | 案件詳細 | 全ロール |
| PUT | `/api/v1/projects/{id}` | 案件更新 | PM以上 |
| DELETE | `/api/v1/projects/{id}` | 案件論理削除 | ADMIN |
| GET | `/api/v1/projects/{id}/summary` | 案件サマリー | 全ロール |
| GET | `/api/v1/projects/{id}/progress` | 工程進捗 | 全ロール |

## リクエスト例（案件作成）
```json
POST /api/v1/projects
{
  "name": "○○ビル新築工事",
  "code": "PROJ-2026-001",
  "client_name": "株式会社○○",
  "start_date": "2026-04-01",
  "end_date": "2027-03-31",
  "budget": 100000000,
  "site_address": "東京都○○区...",
  "manager_id": "uuid",
  "status": "PLANNING"
}
```

## ステータス定義
| ステータス | 説明 |
|-----------|------|
| PLANNING | 計画中 |
| IN_PROGRESS | 施工中 |
| COMPLETED | 完了 |
| SUSPENDED | 中断 |
| CANCELLED | 中止 |

## 検索・フィルター
```
GET /api/v1/projects?status=IN_PROGRESS&manager_id=uuid&keyword=ビル&page=1
```
