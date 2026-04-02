# 🔐 認証API（Authentication API）

## エンドポイント一覧

### ログイン
```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password"
}
```
**レスポンス**
```json
{
  "success": true,
  "data": {
    "access_token": "eyJ...",
    "refresh_token": "eyJ...",
    "expires_in": 3600,
    "user": {
      "id": "uuid",
      "name": "山田太郎",
      "email": "user@example.com",
      "roles": ["PROJECT_MANAGER"]
    }
  }
}
```

### トークンリフレッシュ
```http
POST /api/v1/auth/refresh
Authorization: Bearer {REFRESH_TOKEN}
```

### ログアウト
```http
POST /api/v1/auth/logout
Authorization: Bearer {ACCESS_TOKEN}
```

### ユーザー情報取得
```http
GET /api/v1/auth/me
Authorization: Bearer {ACCESS_TOKEN}
```

## RBACロール定義

| ロール | 権限 |
|--------|------|
| ADMIN | 全操作 |
| PROJECT_MANAGER | 案件管理・全閲覧 |
| SITE_SUPERVISOR | 現場操作・日報・安全 |
| COST_MANAGER | 原価・工数管理 |
| IT_OPERATOR | ITSM操作 |
| VIEWER | 閲覧のみ |

## セキュリティ
- JWTアルゴリズム: RS256
- アクセストークン有効期限: 1時間
- リフレッシュトークン有効期限: 30日
- ログイン失敗: 5回でアカウントロック
