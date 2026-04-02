# テーブル定義：案件管理

## projectsテーブル

工事案件の基本情報を管理するメインテーブル。

### DDL

```sql
CREATE TABLE projects (
    id              BIGSERIAL PRIMARY KEY,
    project_code    VARCHAR(50) UNIQUE NOT NULL,
    name            VARCHAR(200) NOT NULL,
    client_name     VARCHAR(200) NOT NULL,
    client_contact  VARCHAR(100),
    status          VARCHAR(20) NOT NULL DEFAULT 'planning'
                    CHECK (status IN ('planning', 'active', 'on_hold', 'completed', 'cancelled')),
    start_date      DATE NOT NULL,
    end_date        DATE NOT NULL,
    actual_end_date DATE,
    budget          BIGINT NOT NULL DEFAULT 0,
    address         VARCHAR(500),
    prefecture      VARCHAR(50),
    description     TEXT,
    manager_id      BIGINT NOT NULL REFERENCES users(id),
    progress        SMALLINT DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
    tags            TEXT[] DEFAULT '{}',
    metadata        JSONB DEFAULT '{}',
    created_by      BIGINT NOT NULL REFERENCES users(id),
    created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    deleted_at      TIMESTAMP WITH TIME ZONE
);

-- インデックス
CREATE INDEX idx_projects_status ON projects(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_projects_manager_id ON projects(manager_id);
CREATE INDEX idx_projects_start_date ON projects(start_date);
CREATE INDEX idx_projects_code ON projects(project_code);
CREATE INDEX idx_projects_tags ON projects USING GIN(tags);
```

### カラム説明

| カラム名 | 型 | NULL | デフォルト | 説明 |
|---------|---|----|---------|------|
| id | BIGSERIAL | NO | 自動採番 | 主キー |
| project_code | VARCHAR(50) | NO | - | 案件コード（PRJ-2026-001形式） |
| name | VARCHAR(200) | NO | - | 案件名称 |
| client_name | VARCHAR(200) | NO | - | 発注者名 |
| client_contact | VARCHAR(100) | YES | NULL | 発注者担当者名 |
| status | VARCHAR(20) | NO | planning | ステータス |
| start_date | DATE | NO | - | 着工予定日 |
| end_date | DATE | NO | - | 完工予定日 |
| actual_end_date | DATE | YES | NULL | 実際の完工日 |
| budget | BIGINT | NO | 0 | 予算金額（円） |
| address | VARCHAR(500) | YES | NULL | 工事場所住所 |
| prefecture | VARCHAR(50) | YES | NULL | 都道府県 |
| description | TEXT | YES | NULL | 工事概要 |
| manager_id | BIGINT | NO | - | 担当者（FK: users） |
| progress | SMALLINT | YES | 0 | 進捗率（%） |
| tags | TEXT[] | NO | {} | タグ配列 |
| metadata | JSONB | NO | {} | 追加メタデータ |
| created_by | BIGINT | NO | - | 作成者（FK: users） |
| created_at | TIMESTAMPTZ | NO | NOW() | 作成日時 |
| updated_at | TIMESTAMPTZ | NO | NOW() | 更新日時 |
| deleted_at | TIMESTAMPTZ | YES | NULL | 論理削除日時 |

## project_membersテーブル

案件と参加メンバーの中間テーブル。

```sql
CREATE TABLE project_members (
    id          BIGSERIAL PRIMARY KEY,
    project_id  BIGINT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id     BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role        VARCHAR(50) NOT NULL DEFAULT 'member'
                CHECK (role IN ('manager', 'sub_manager', 'engineer', 'member')),
    joined_at   DATE NOT NULL DEFAULT CURRENT_DATE,
    left_at     DATE,
    created_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE(project_id, user_id)
);

CREATE INDEX idx_project_members_project ON project_members(project_id);
CREATE INDEX idx_project_members_user ON project_members(user_id);
```

## ステータス遷移制約

```sql
-- ステータス遷移バリデーション関数
CREATE OR REPLACE FUNCTION validate_project_status_transition()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status = 'completed' AND NEW.status != 'completed' THEN
        RAISE EXCEPTION '完了済み案件のステータスは変更できません';
    END IF;
    IF OLD.status = 'cancelled' THEN
        RAISE EXCEPTION 'キャンセル済み案件のステータスは変更できません';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_project_status_transition
    BEFORE UPDATE OF status ON projects
    FOR EACH ROW EXECUTE FUNCTION validate_project_status_transition();
```
