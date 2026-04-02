# 📡 API設計概要（API Design Overview）

## 設計方針
- **RESTful API** 設計
- **OpenAPI 3.0** 仕様書管理
- **APIファースト** 開発
- バージョニング: `/api/v1/`

## 共通仕様

### 認証
```http
Authorization: Bearer {JWT_TOKEN}
```

### レスポンス形式
```json
{
  "success": true,
  "data": {},
  "meta": {
    "total": 100,
    "page": 1,
    "per_page": 20
  },
  "errors": []
}
```

### エラーレスポンス
```json
{
  "success": false,
  "errors": [
    {
      "code": "VALIDATION_ERROR",
      "message": "入力値が不正です",
      "field": "name"
    }
  ]
}
```

### HTTPステータスコード
| コード | 意味 |
|--------|------|
| 200 | 成功 |
| 201 | 作成成功 |
| 400 | リクエスト不正 |
| 401 | 認証エラー |
| 403 | 権限なし |
| 404 | リソース未存在 |
| 422 | バリデーションエラー |
| 500 | サーバーエラー |

## モジュール別APIベースURL

| モジュール | ベースURL |
|-----------|-----------|
| 認証 | `/api/v1/auth` |
| 案件管理 | `/api/v1/projects` |
| 日報管理 | `/api/v1/daily-reports` |
| 写真管理 | `/api/v1/photos` |
| 安全・品質 | `/api/v1/safety`, `/api/v1/quality` |
| 原価管理 | `/api/v1/costs` |
| ITSM | `/api/v1/itsm` |
| ナレッジ・AI | `/api/v1/knowledge`, `/api/v1/ai` |

## ページネーション
```
GET /api/v1/projects?page=1&per_page=20&sort=created_at&order=desc
```
