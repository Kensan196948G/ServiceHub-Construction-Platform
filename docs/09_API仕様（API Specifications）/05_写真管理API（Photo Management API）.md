# 🖼️ 写真管理API（Photo Management API）

## エンドポイント一覧

| メソッド | パス | 説明 |
|--------|------|------|
| GET | `/api/v1/photos` | 写真一覧 |
| POST | `/api/v1/photos/upload` | 写真アップロード |
| GET | `/api/v1/photos/{id}` | 写真詳細 |
| PUT | `/api/v1/photos/{id}` | 写真メタデータ更新 |
| DELETE | `/api/v1/photos/{id}` | 写真論理削除 |
| POST | `/api/v1/photos/{id}/auto-tag` | AIタグ自動付与 |
| GET | `/api/v1/photos/search` | 写真検索 |

## アップロード仕様
```
POST /api/v1/photos/upload
Content-Type: multipart/form-data

Fields:
  file: (binary) JPEG/PNG/HEIC 最大10MB
  project_id: uuid
  daily_report_id: uuid (optional)
  category: PROGRESS/SAFETY/QUALITY/OTHER
  description: string (optional)
  taken_at: datetime
  location_lat: float (optional)
  location_lng: float (optional)
```

## AIタグ自動付与
- Vision APIで写真内容を分析
- 工種・状態・場所などを自動タグ化
- 監査ログに AI利用記録を保存
