# 管理者設定ガイド

システム管理者（`ADMIN` ロール）向けの初期設定・ユーザー管理・運用設定を説明します。

## ロール一覧と権限

| ロール | 説明 | 主な権限 |
|---|---|---|
| `ADMIN` | システム管理者 | 全操作 + ユーザー管理 |
| `PROJECT_MANAGER` | 工事管理者 | 案件CRUD・承認・全日報閲覧 |
| `SITE_SUPERVISOR` | 現場監督 | 日報作成・安全確認 |
| `COST_MANAGER` | 原価管理者 | 原価記録・予実サマリー |
| `IT_OPERATOR` | IT運用担当 | ITSM操作・ナレッジ管理 |
| `VIEWER` | 閲覧者 | 全データの読み取りのみ |

> **SoD（職務分離）**: `COST_MANAGER` は変更要求の承認ができません。`PROJECT_MANAGER` が原価入力はできません。これは ISO 20000 準拠の設計です。

## 1. 初期ユーザー設定

### 管理者アカウントの確認

```bash
docker compose exec backend python -c "
import asyncio
from app.db.session import AsyncSessionLocal
from app.models.user import User
from sqlalchemy import select

async def check():
    async with AsyncSessionLocal() as db:
        users = await db.execute(select(User).where(User.role == 'admin'))
        for u in users.scalars():
            print(f'{u.email} ({u.role})')

asyncio.run(check())
"
```

### ユーザーの作成

```http
POST /api/v1/users/
Authorization: Bearer {admin_access_token}
Content-Type: application/json

{
  "email": "manager@example.com",
  "full_name": "山田 太郎",
  "password": "SecurePass1234!",
  "role": "project_manager"
}
```

### ユーザーのロール変更

```http
PATCH /api/v1/users/{user_id}
Authorization: Bearer {admin_access_token}
Content-Type: application/json

{
  "role": "site_supervisor"
}
```

## 2. 環境変数による設定

`.env` で以下の項目を管理します:

| 変数名 | デフォルト | 説明 |
|---|---|---|
| `JWT_SECRET_KEY` | (必須変更) | JWT署名キー。本番では 64 文字以上のランダム文字列 |
| `JWT_ALGORITHM` | `HS256` | 署名アルゴリズム |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `15` | アクセストークン有効期限（分） |
| `REFRESH_TOKEN_EXPIRE_DAYS` | `7` | リフレッシュトークン有効期限（日） |
| `LOGIN_RATE_LIMIT` | `5/minute` | ログインレート制限 |
| `ALLOWED_ORIGINS` | `http://localhost` | CORS 許可オリジン（カンマ区切り） |

## 3. データベースのバックアップ

### 手動バックアップ

```bash
docker compose exec db pg_dump -U servicehub servicehub > backup_$(date +%Y%m%d).sql
```

### リストア

```bash
docker compose exec -T db psql -U servicehub servicehub < backup_20260425.sql
```

## 4. 監視の確認

Prometheus + Grafana スタックを使用した監視:

```bash
# 監視スタック起動
make monitoring-up

# Grafana ダッシュボード
open http://localhost:3001  # admin / admin (初回)

# Prometheus メトリクス
open http://localhost:9090

# Alertmanager
open http://localhost:9093
```

> **本番設定**: `monitoring/grafana/` 配下の `grafana.env` で管理者パスワードを変更してください。

## 5. セキュリティ監査ログの確認

全 API 操作は structlog 形式で記録されています:

```bash
docker compose logs backend | grep '"user_id"' | tail -50
```

ログ形式:
```json
{
  "timestamp": "2026-04-25T10:00:00Z",
  "level": "info",
  "event": "project_created",
  "user_id": 1,
  "project_id": 42,
  "request_id": "abc-123"
}
```

## 6. ITSM インシデント・変更要求の管理

### インシデント起票（IT_OPERATOR 以上）

```http
POST /api/v1/itsm/incidents
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "title": "API応答遅延",
  "description": "projects エンドポイントで P95 > 2s",
  "priority": "high",
  "category": "performance"
}
```

### 変更要求の承認（ADMIN のみ）

変更要求の承認は SoD により `ADMIN` のみが実行できます:

```http
PATCH /api/v1/itsm/changes/{change_id}/approve
Authorization: Bearer {admin_access_token}
```

## 7. 秘密情報のローテーション

`docs/security/secret-rotation.md` の手順を参照してください。定期ローテーション推奨サイクル:

| シークレット | ローテーション周期 |
|---|---|
| `JWT_SECRET_KEY` | 90 日 |
| データベースパスワード | 180 日 |
| MinIO アクセスキー | 180 日 |
| OpenAI API キー | 漏洩時即時 |

## 関連ドキュメント

- [はじめに](getting-started.md) — 環境構築
- [工事案件管理ガイド](construction-projects.md) — 案件操作
- [秘密情報ローテーション手順](../security/secret-rotation.md)
- [Kubernetes デプロイメント](../deployment/kubernetes.md)
