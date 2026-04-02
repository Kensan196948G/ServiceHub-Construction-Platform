# 📋 テーブル定義：案件（projects）

## projects テーブル

| カラム名 | 型 | NULL | デフォルト | 説明 |
|---------|-----|------|-----------|------|
| id | UUID | NO | gen_random_uuid() | 主キー |
| code | VARCHAR(50) | NO | - | 案件コード（ユニーク） |
| name | VARCHAR(200) | NO | - | 案件名 |
| client_name | VARCHAR(200) | NO | - | 発注者名 |
| status | VARCHAR(20) | NO | 'PLANNING' | ステータス |
| start_date | DATE | YES | - | 着工予定日 |
| end_date | DATE | YES | - | 竣工予定日 |
| actual_start_date | DATE | YES | - | 実際着工日 |
| actual_end_date | DATE | YES | - | 実際竣工日 |
| budget | BIGINT | YES | - | 請負金額（円） |
| site_address | TEXT | YES | - | 工事場所 |
| manager_id | UUID | YES | - | 担当PM (FK: users.id) |
| description | TEXT | YES | - | 備考 |
| created_by | UUID | NO | - | 作成者 (FK: users.id) |
| updated_by | UUID | YES | - | 更新者 |
| created_at | TIMESTAMPTZ | NO | NOW() | 作成日時 |
| updated_at | TIMESTAMPTZ | NO | NOW() | 更新日時 |
| deleted_at | TIMESTAMPTZ | YES | NULL | 論理削除日時 |

## DDL
```sql
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(200) NOT NULL,
    client_name VARCHAR(200) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PLANNING'
        CHECK (status IN ('PLANNING','IN_PROGRESS','COMPLETED','SUSPENDED','CANCELLED')),
    start_date DATE,
    end_date DATE,
    actual_start_date DATE,
    actual_end_date DATE,
    budget BIGINT,
    site_address TEXT,
    manager_id UUID REFERENCES users(id),
    description TEXT,
    created_by UUID NOT NULL REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_projects_status ON projects(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_projects_manager ON projects(manager_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_projects_code ON projects(code) WHERE deleted_at IS NULL;
```
