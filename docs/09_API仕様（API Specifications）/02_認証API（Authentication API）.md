# 認証API仕様

## 概要
ユーザー認証・認可に関するAPI仕様を定義する。JWT（JSON Web Token）ベースの認証を使用。

## エンドポイント一覧

| メソッド | エンドポイント | 説明 | 認証 |
|---------|-------------|------|------|
| POST | /auth/login | ログイン | 不要 |
| POST | /auth/logout | ログアウト | 必要 |
| POST | /auth/refresh | トークン更新 | 必要 |
| POST | /auth/mfa/setup | MFAセットアップ | 必要 |
| POST | /auth/mfa/verify | MFA検証 | 必要 |
| GET | /auth/me | ログインユーザー情報取得 | 必要 |
| PUT | /auth/password | パスワード変更 | 必要 |
| POST | /auth/password/reset | パスワードリセット要求 | 不要 |

## POST /auth/login

### リクエスト
```json
{
  "email": "yamada@example.com",
  "password": "SecurePassword123!",
  "mfa_code": "123456"
}
```

### レスポンス (200 OK)
```json
{
  "success": true,
  "data": {
    "access_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refresh_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
    "token_type": "bearer",
    "expires_in": 3600,
    "user": {
      "id": 1,
      "email": "yamada@example.com",
      "name": "山田太郎",
      "role": "engineer",
      "department": "工事部"
    }
  }
}
```

### エラーレスポンス
| ステータス | エラーコード | 説明 |
|---------|-----------|------|
| 401 | INVALID_CREDENTIALS | メールまたはパスワードが不正 |
| 401 | MFA_CODE_REQUIRED | MFAコードが必要 |
| 401 | MFA_CODE_INVALID | MFAコードが不正 |
| 429 | RATE_LIMIT_EXCEEDED | ログイン試行超過（10回/分） |

## POST /auth/refresh

### リクエスト
```json
{
  "refresh_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### レスポンス (200 OK)
```json
{
  "success": true,
  "data": {
    "access_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expires_in": 3600
  }
}
```

## JWTペイロード構造

```json
{
  "sub": "1",
  "email": "yamada@example.com",
  "name": "山田太郎",
  "role": "engineer",
  "permissions": ["project:read", "daily_report:write"],
  "iat": 1714878600,
  "exp": 1714882200,
  "jti": "unique-token-id"
}
```

## ロール・権限マトリクス

| 権限 | admin | manager | engineer | viewer |
|------|-------|---------|----------|--------|
| project:create | ✅ | ✅ | ❌ | ❌ |
| project:read | ✅ | ✅ | ✅ | ✅ |
| project:update | ✅ | ✅ | ❌ | ❌ |
| project:delete | ✅ | ❌ | ❌ | ❌ |
| daily_report:write | ✅ | ✅ | ✅ | ❌ |
| cost:read | ✅ | ✅ | ❌ | ❌ |
| admin:manage | ✅ | ❌ | ❌ | ❌ |

## セキュリティ仕様

- **アルゴリズム**: RS256（非対称鍵）
- **アクセストークン有効期限**: 1時間
- **リフレッシュトークン有効期限**: 7日間
- **トークンローテーション**: リフレッシュ時に新トークン発行、旧無効化
- **ブラックリスト**: ログアウト済みJTIをRedisに保存
