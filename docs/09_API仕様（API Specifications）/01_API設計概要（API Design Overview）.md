# API設計概要

## 概要
ServiceHub建設プラットフォームのREST API設計の基本方針・共通仕様を定義する。

## API設計原則

- **RESTful設計**: リソース指向アーキテクチャ
- **バージョニング**: URLパスベース（/api/v1/）
- **認証**: JWT Bearer Token
- **レスポンス形式**: JSON
- **文字エンコーディング**: UTF-8

## ベースURL

```
本番: https://api.servicehub.example.com/api/v1
ステージング: https://staging-api.servicehub.example.com/api/v1
開発: http://localhost:8000/api/v1
```

## 共通リクエストヘッダー

| ヘッダー名 | 必須 | 値の例 | 説明 |
|-----------|------|--------|------|
| Authorization | ✅ | Bearer {jwt_token} | JWT認証トークン |
| Content-Type | ✅(POST/PUT) | application/json | リクエスト形式 |
| Accept | - | application/json | レスポンス形式 |
| X-Request-ID | - | uuid-v4 | リクエスト追跡ID |
| Accept-Language | - | ja | 言語設定 |

## 共通レスポンス形式

### 成功レスポンス
```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "request_id": "550e8400-e29b-41d4-a716-446655440000",
    "timestamp": "2026-04-15T09:30:00+09:00",
    "version": "1.0.0"
  }
}
```

### エラーレスポンス
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "入力値が不正です",
    "details": [
      {
        "field": "start_date",
        "message": "開始日は終了日より前でなければなりません"
      }
    ]
  },
  "meta": {
    "request_id": "550e8400-e29b-41d4-a716-446655440000",
    "timestamp": "2026-04-15T09:30:00+09:00"
  }
}
```

### ページネーションレスポンス
```json
{
  "success": true,
  "data": {
    "items": [...],
    "pagination": {
      "total": 150,
      "page": 1,
      "per_page": 20,
      "total_pages": 8,
      "has_next": true,
      "has_prev": false
    }
  }
}
```

## HTTPステータスコード

| コード | 意味 | 使用場面 |
|--------|------|---------|
| 200 | OK | 取得・更新成功 |
| 201 | Created | 新規作成成功 |
| 204 | No Content | 削除成功 |
| 400 | Bad Request | バリデーションエラー |
| 401 | Unauthorized | 認証エラー |
| 403 | Forbidden | 権限エラー |
| 404 | Not Found | リソース未存在 |
| 409 | Conflict | 重複エラー |
| 422 | Unprocessable Entity | 処理不能 |
| 429 | Too Many Requests | レート制限 |
| 500 | Internal Server Error | サーバーエラー |

## エラーコード一覧

| エラーコード | HTTP | 説明 |
|-----------|------|------|
| AUTH_TOKEN_MISSING | 401 | トークン未提供 |
| AUTH_TOKEN_EXPIRED | 401 | トークン期限切れ |
| AUTH_TOKEN_INVALID | 401 | トークン不正 |
| PERMISSION_DENIED | 403 | 権限不足 |
| RESOURCE_NOT_FOUND | 404 | リソース未存在 |
| VALIDATION_ERROR | 400 | バリデーションエラー |
| DUPLICATE_RESOURCE | 409 | 重複データ |
| RATE_LIMIT_EXCEEDED | 429 | レート制限超過 |
| INTERNAL_ERROR | 500 | 内部エラー |

## レート制限

| エンドポイント種別 | 制限 | ウィンドウ |
|-----------------|------|---------|
| 認証API | 10回 | 1分 |
| 通常API | 100回 | 1分 |
| ファイルアップロード | 20回 | 1分 |
| AI機能API | 30回 | 1分 |
| 一括処理API | 5回 | 1分 |

## APIドキュメント

- OpenAPI 3.1仕様: `/api/v1/openapi.json`
- Swagger UI: `/api/v1/docs`
- ReDoc: `/api/v1/redoc`
