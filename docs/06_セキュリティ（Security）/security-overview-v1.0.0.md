# セキュリティ概要 v1.0.0

> ServiceHub Construction Platform — セキュリティアーキテクチャ概要  
> 準拠規格: ISO 27001 / ISO 20000 / OWASP Top 10

---

## 目次

1. [セキュリティ基本方針](#セキュリティ基本方針)
2. [認証方式（Authentication）](#認証方式-authentication)
3. [認可方式（Authorization / RBAC）](#認可方式-authorization--rbac)
4. [SoD（職務分離）実装](#sod職務分離実装)
5. [監査ログ設計](#監査ログ設計)
6. [セキュリティスキャン（bandit）](#セキュリティスキャン-bandit)
7. [パスワードセキュリティ](#パスワードセキュリティ)
8. [通信セキュリティ](#通信セキュリティ)
9. [セキュリティチェックリスト](#セキュリティチェックリスト)

---

## セキュリティ基本方針

| 観点 | 方針 |
|------|------|
| 最小権限の原則 | ユーザーは業務に必要な最小限のロールのみ付与 |
| 多層防御 | JWT認証 → RBAC認可 → SoD の3層で保護 |
| 監査証跡 | 全操作をAuditLogテーブルに記録（変更前後のデータ含む） |
| 安全な初期値 | デフォルト権限は `VIEWER`（読み取り専用） |
| 論理削除 | データは物理削除せず `deleted_at` タイムスタンプで管理 |

---

## 認証方式 (Authentication)

### JWT (JSON Web Token) HS256

| 項目 | 値 |
|------|----|
| アルゴリズム | HS256（HMAC-SHA256） |
| アクセストークン有効期限 | **15分** |
| リフレッシュトークン有効期限 | **7日** |
| シークレットキー管理 | 環境変数 `SECRET_KEY` で管理（ハードコード禁止） |
| トークン種別識別 | ペイロードの `type` フィールドで `access` / `refresh` を区別 |

### トークン構造

```
Header:  { "alg": "HS256", "typ": "JWT" }
Payload: {
  "sub":  "<user_uuid>",
  "role": "<UserRole>",
  "type": "access" | "refresh",
  "exp":  <unix_timestamp>
}
```

### 認証フロー

```
クライアント                     APIサーバー
    │                               │
    │── POST /auth/login ──────────>│
    │   { email, password }         │ verify_password (bcrypt)
    │                               │
    │<─── access_token (15min) ─────│
    │<─── refresh_token (7day) ─────│
    │                               │
    │── GET /api/v1/projects ──────>│
    │   Authorization: Bearer xxx   │ verify_token (HS256)
    │                               │ require_roles(...)
    │<─── 200 OK ───────────────────│
    │                               │
    │── POST /auth/refresh ────────>│  ← トークン期限切れ時
    │   { refresh_token }           │
    │<─── new access_token ─────────│
```

### 無効ユーザー対応

- `is_active = false` のユーザーは `403 Forbidden` で拒否
- 論理削除済み（`deleted_at IS NOT NULL`）ユーザーは認証不可
- 最終ログイン日時（`last_login_at`）を監査用に記録

---

## 認可方式 (Authorization / RBAC)

### ロール定義（6ロール）

| ロール | 識別子 | 用途 |
|--------|--------|------|
| 管理者 | `ADMIN` | システム全体の管理・全機能フルアクセス |
| プロジェクトマネージャー | `PROJECT_MANAGER` | 案件・日報・写真・コスト・ナレッジ管理 |
| 現場監督 | `SITE_SUPERVISOR` | 日報・写真・安全品質チェック |
| コスト管理者 | `COST_MANAGER` | 原価・工数データの参照・入力 |
| IT運用担当者 | `IT_OPERATOR` | ITSM操作（インシデント/変更要求）・ナレッジ管理 |
| 閲覧者 | `VIEWER` | 読み取り専用アクセス（デフォルトロール） |

### ロール階層

`ADMIN` は全ロールの権限を包含します。上位ロールは下位権限を自動的に取得します。

```
ADMIN
 ├─ PROJECT_MANAGER
 │    ├─ SITE_SUPERVISOR
 │    │    └─ VIEWER
 │    ├─ COST_MANAGER
 │    │    └─ VIEWER
 │    └─ VIEWER
 ├─ IT_OPERATOR
 │    └─ VIEWER
 └─ VIEWER
```

### エンドポイント別ロール制限サマリー

| カテゴリ | 操作 | 最小必要ロール |
|----------|------|----------------|
| 工事案件 | 一覧・詳細 | VIEWER |
| 工事案件 | 作成・更新 | PROJECT_MANAGER |
| 工事案件 | 削除 | ADMIN |
| 日報 | 全操作 | SITE_SUPERVISOR |
| 写真 | 閲覧 | VIEWER |
| 写真 | アップロード・更新 | SITE_SUPERVISOR |
| 写真 | 削除 | PROJECT_MANAGER |
| 安全・品質 | 全操作 | SITE_SUPERVISOR |
| 原価・工数 | コスト操作 | COST_MANAGER |
| 原価 | 工数記録 | SITE_SUPERVISOR |
| ITSM インシデント | 全操作 | IT_OPERATOR |
| ITSM 変更要求 | 起票 | IT_OPERATOR |
| ITSM 変更要求 | 承認 | ADMIN |
| ナレッジ | 閲覧・AI検索 | VIEWER |
| ナレッジ | 作成・更新・削除 | IT_OPERATOR |

### RBAC 実装箇所

```python
# backend/app/core/rbac.py

class UserRole(str, Enum):
    ADMIN         = "ADMIN"
    PROJECT_MANAGER = "PROJECT_MANAGER"
    SITE_SUPERVISOR = "SITE_SUPERVISOR"
    COST_MANAGER  = "COST_MANAGER"
    IT_OPERATOR   = "IT_OPERATOR"
    VIEWER        = "VIEWER"

def require_roles(*allowed_roles: UserRole) -> Callable:
    """FastAPI Depends に組み込むロール検証デコレータ"""
    async def role_checker(current_user = Depends(get_current_user)) -> User:
        user_role = UserRole(current_user.role)
        effective_roles = ROLE_HIERARCHY.get(user_role, {user_role})
        if not any(role in effective_roles for role in allowed_roles):
            raise HTTPException(status_code=403, detail="権限が不足しています")
        return current_user
    return role_checker
```

---

## SoD（職務分離）実装

SoD（Segregation of Duties）は、同一人物が申請・承認両方を実施できないよう制御します。

### 対象: 変更要求管理（ISO 20000準拠）

| 操作 | 実施可能ロール | 実装場所 |
|------|----------------|---------|
| 変更要求の**起票** | `IT_OPERATOR` のみ（ADMINも可） | `POST /api/v1/itsm/changes` |
| 変更要求の**承認** | `ADMIN` のみ | `PATCH /api/v1/itsm/changes/{id}/approve` |

```
起票: IT_OPERATORが担当 ──────────────────────┐
                                              ↓
承認: ADMINが別途レビュー・承認 ←── 起票者と承認者は必ず別人
```

### SoD 検証テスト

```python
# backend/tests/test_sod.py
# IT_OPERATORが起票した変更要求をADMINが承認するシナリオを自動検証
# IT_OPERATORが自分で承認しようとすると403が返ることを確認
```

---

## 監査ログ設計

### AuditLog テーブル定義

| カラム | 型 | 説明 |
|--------|----|------|
| `id` | UUID | 主キー |
| `user_id` | UUID (FK) | 操作ユーザー（削除時 NULL） |
| `action` | VARCHAR(100) | 操作種別: `CREATE` / `UPDATE` / `DELETE` / `LOGIN` |
| `resource` | VARCHAR(100) | 対象リソース: `users` / `projects` / `incidents` 等 |
| `resource_id` | UUID | 対象リソースのID |
| `before_data` | JSONB | 変更前データ（UPDATE/DELETE 時） |
| `after_data` | JSONB | 変更後データ（CREATE/UPDATE 時） |
| `ip_address` | VARCHAR(45) | 操作元IPアドレス（IPv6対応） |
| `user_agent` | TEXT | 操作元ユーザーエージェント |
| `created_at` | TIMESTAMPTZ | 操作日時（タイムゾーン付き） |

### 記録対象操作

| 操作 | 記録タイミング | 備考 |
|------|----------------|------|
| ログイン成功 | `POST /auth/login` 成功時 | `last_login_at` も更新 |
| ログアウト | `POST /auth/logout` 実行時 | |
| 案件 作成/更新/削除 | 各API実行時 | before/after データ保存 |
| ITSM 変更要求承認 | 承認操作時 | SoD検証ポイント |
| ユーザー管理 | ADMIN操作時 | ロール変更も記録 |

### ログ保管ポリシー

| 項目 | 設定 |
|------|------|
| 保管期間 | 最低1年（コンプライアンス要件） |
| 削除 | 物理削除禁止（法的証拠保全） |
| アクセス制御 | `ADMIN` ロールのみ参照可 |
| バックアップ | PostgreSQL バックアップに含む（日次） |

---

## セキュリティスキャン (bandit)

### 概要

[bandit](https://bandit.readthedocs.io/) による Python コードの静的セキュリティ解析を CI/CD に組み込んでいます。

### 実行方法

```bash
# コンテナ内で実行
docker compose -f docker-compose.local.yml exec api \
  bandit -r app/ -f json -o bandit-report.json

# または GitHub Actions CI で自動実行
# .github/workflows/ci.yml の "security scan" ジョブ参照
```

### スキャン対象・設定

```ini
# bandit 設定（.bandit または pyproject.toml）
[tool.bandit]
targets = ["app"]
exclude_dirs = ["tests", "__pycache__"]
skips = []  # 全チェック有効
```

### CI/CD ステータス

| チェック | ステータス |
|----------|-----------|
| bandit 静的解析 | ✅ PASS |
| ruff リンター | ✅ PASS |
| mypy 型チェック（strict） | ✅ PASS |
| pytest（30件） | ✅ PASS |

---

## パスワードセキュリティ

| 項目 | 実装 |
|------|------|
| ハッシュアルゴリズム | bcrypt（コストファクター: 12） |
| 最小文字数 | 8文字以上 |
| 複雑性要件 | 大文字・小文字・数字・記号の混在推奨 |
| 平文保存 | **禁止**（ハッシュのみ保存） |

```python
# backend/app/core/security.py
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)
```

---

## 通信セキュリティ

### 本番環境

| 項目 | 設定 |
|------|------|
| プロトコル | HTTPS (TLS 1.2以上) |
| リバースプロキシ | Nginx によるTLS終端 |
| CORS | 許可オリジンを明示的に設定 |
| Secure Cookie | `Secure` / `HttpOnly` / `SameSite=Strict` |

### ローカル開発環境

| 項目 | 設定 |
|------|------|
| プロトコル | HTTP（開発用） |
| CORS | `ENVIRONMENT=development` 時は広めに許可 |

---

## セキュリティチェックリスト

### デプロイ前確認事項

- [ ] `SECRET_KEY` を推測困難なランダム文字列（64文字以上）に変更
- [ ] `ENVIRONMENT=production` を設定
- [ ] デフォルト管理者パスワード（`Admin1234!`）を変更
- [ ] MinIO デフォルト認証情報（`minioadmin/minioadmin123`）を変更
- [ ] HTTPS 証明書の設定
- [ ] PostgreSQL パスワードを変更
- [ ] bandit スキャンの PASS 確認
- [ ] mypy strict チェックの PASS 確認
- [ ] pytest 全件 PASS 確認

---

## 関連ドキュメント

- [認証認可設計](02_認証認可設計（Auth Design）.md)
- [監査ログ設計](03_監査ログ設計（Audit Log Design）.md)
- [脆弱性管理](04_脆弱性管理（Vulnerability Management）.md)
- [API リファレンス](../09_API仕様（API Specifications）/api-reference-v1.0.0.md)
