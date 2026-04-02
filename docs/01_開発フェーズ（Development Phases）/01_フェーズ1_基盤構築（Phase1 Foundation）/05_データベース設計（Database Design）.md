# データベース設計

## 概要

PostgreSQL 16を採用し、Alembicによるマイグレーション管理を行う。設計原則として正規化（第3正規形）を基本とし、パフォーマンスが求められる箇所では非正規化・マテリアライズドビューを活用する。

| 項目 | 内容 |
|-----|------|
| DBMS | PostgreSQL 16 |
| マイグレーション | Alembic 1.13.x |
| ORM | SQLAlchemy 2.0 |
| 文字コード | UTF-8 |
| タイムゾーン | UTC（アプリ層でJST変換） |

---

## データベース構成

```
servicehub (メインDB)
├── auth スキーマ        # 認証・ユーザー管理
├── projects スキーマ   # 工事案件管理
├── reports スキーマ    # 日報管理
├── media スキーマ      # 写真・資料管理
├── safety スキーマ     # 安全品質管理
├── costs スキーマ      # 原価・工数管理
├── itsm スキーマ       # ITSM管理
├── knowledge スキーマ  # ナレッジ管理
└── audit スキーマ      # 監査ログ
```

---

## 共通カラム設計

全テーブルに以下の共通カラムを設ける：

```sql
-- 共通カラム（全テーブル）
id          UUID PRIMARY KEY DEFAULT gen_random_uuid()
created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
created_by  UUID REFERENCES auth.users(id)
updated_by  UUID REFERENCES auth.users(id)
is_deleted  BOOLEAN NOT NULL DEFAULT FALSE  -- 論理削除
deleted_at  TIMESTAMPTZ
deleted_by  UUID REFERENCES auth.users(id)
```

---

## 主要テーブル一覧

| スキーマ | テーブル名 | 説明 |
|---------|---------|------|
| auth | users | ユーザー情報 |
| auth | roles | ロール定義 |
| auth | user_roles | ユーザー・ロール紐付け |
| auth | permissions | 権限定義 |
| auth | role_permissions | ロール・権限紐付け |
| projects | projects | 工事案件 |
| projects | project_members | 案件メンバー |
| projects | project_statuses | 案件ステータス履歴 |
| reports | daily_reports | 日報 |
| reports | report_approvals | 日報承認履歴 |
| reports | work_logs | 工数記録 |
| media | photos | 写真・資料 |
| media | photo_tags | 写真タグ |
| safety | safety_checks | 安全点検 |
| safety | hazard_reports | ヒヤリハット |
| safety | quality_inspections | 品質検査 |
| costs | budgets | 予算 |
| costs | actual_costs | 実績原価 |
| itsm | incidents | インシデント |
| itsm | problems | 問題 |
| itsm | changes | 変更要求 |
| knowledge | articles | ナレッジ記事 |
| audit | audit_logs | 監査ログ |

---

## 主要テーブル定義例

### auth.users テーブル

```sql
CREATE TABLE auth.users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email           VARCHAR(255) UNIQUE NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    full_name       VARCHAR(100) NOT NULL,
    employee_id     VARCHAR(50) UNIQUE,
    department      VARCHAR(100),
    phone           VARCHAR(20),
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    is_mfa_enabled  BOOLEAN NOT NULL DEFAULT FALSE,
    mfa_secret      VARCHAR(255),
    last_login_at   TIMESTAMPTZ,
    login_fail_count INTEGER NOT NULL DEFAULT 0,
    locked_until    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_email ON auth.users(email);
CREATE INDEX idx_users_employee_id ON auth.users(employee_id);
```

### projects.projects テーブル

```sql
CREATE TABLE projects.projects (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_code    VARCHAR(50) UNIQUE NOT NULL,
    project_name    VARCHAR(200) NOT NULL,
    client_name     VARCHAR(200) NOT NULL,
    location        VARCHAR(300),
    start_date      DATE NOT NULL,
    end_date        DATE,
    status          VARCHAR(50) NOT NULL DEFAULT 'planning',
    budget_amount   DECIMAL(15,2),
    description     TEXT,
    project_manager_id UUID REFERENCES auth.users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by      UUID REFERENCES auth.users(id),
    is_deleted      BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX idx_projects_code ON projects.projects(project_code);
CREATE INDEX idx_projects_status ON projects.projects(status);
CREATE INDEX idx_projects_manager ON projects.projects(project_manager_id);
CREATE INDEX idx_projects_dates ON projects.projects(start_date, end_date);
```

---

## インデックス戦略

| 種別 | 適用場面 | 注意事項 |
|-----|---------|---------|
| B-treeインデックス | 等値検索・範囲検索 | デフォルト。一般的なクエリに使用 |
| GINインデックス | 全文検索（tsvector）、JSONB検索 | 更新コストが高い |
| BRINインデックス | 時系列データ（created_at等） | テーブルスキャンより高速 |
| 部分インデックス | 特定条件のみ（is_deleted=FALSE等） | インデックスサイズを削減 |
| 複合インデックス | 複数カラムの複合検索 | カラム順序に注意 |

---

## マイグレーション方針

### Alembicコマンド

```bash
# マイグレーションファイル作成
alembic revision --autogenerate -m "add_projects_table"

# マイグレーション実行（最新）
alembic upgrade head

# 1つ前に戻す
alembic downgrade -1

# 特定バージョンに戻す
alembic downgrade <revision_id>

# 現在のバージョン確認
alembic current

# マイグレーション履歴確認
alembic history
```

### マイグレーション命名規則

```
YYYYMMDDHHMMSS_説明.py
例: 20260402120000_initial_schema.py
    20260410150000_add_projects_table.py
```

---

## バックアップ・リストア設計

```bash
# バックアップ
pg_dump -Fc -U servicehub_user servicehub > backup_$(date +%Y%m%d).dump

# リストア
pg_restore -U servicehub_user -d servicehub backup_20260402.dump
```

| 種別 | 頻度 | 保管期間 | 保管場所 |
|-----|------|---------|---------|
| フルバックアップ | 日次（深夜2時） | 30日間 | オフサイトS3 |
| WALアーカイブ | 継続 | 7日間 | ローカルストレージ |
| スナップショット | 週次 | 90日間 | オフサイトS3 |
