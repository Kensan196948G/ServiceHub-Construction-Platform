# 📝 テーブル定義：日報（daily_reports）

## daily_reports テーブル

| カラム名 | 型 | NULL | 説明 |
|---------|-----|------|------|
| id | UUID | NO | 主キー |
| project_id | UUID | NO | 案件ID (FK) |
| report_date | DATE | NO | 日報日付 |
| weather | VARCHAR(20) | YES | 天気 |
| temperature | DECIMAL(4,1) | YES | 気温 |
| workers_count | INTEGER | YES | 作業員数 |
| work_content | TEXT | NO | 作業内容 |
| progress_rate | DECIMAL(5,2) | YES | 進捗率（%） |
| issues | TEXT | YES | 課題・問題点 |
| tomorrow_plan | TEXT | YES | 翌日の作業予定 |
| status | VARCHAR(20) | NO | DRAFT/SUBMITTED/APPROVED |
| approved_by | UUID | YES | 承認者ID |
| approved_at | TIMESTAMPTZ | YES | 承認日時 |
| ai_generated | BOOLEAN | NO | AI生成フラグ |
| reporter_id | UUID | NO | 報告者ID |
| created_at | TIMESTAMPTZ | NO | 作成日時 |
| updated_at | TIMESTAMPTZ | NO | 更新日時 |
| deleted_at | TIMESTAMPTZ | YES | 論理削除 |

## DDL
```sql
CREATE TABLE daily_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id),
    report_date DATE NOT NULL,
    weather VARCHAR(20),
    temperature DECIMAL(4,1),
    workers_count INTEGER CHECK (workers_count >= 0),
    work_content TEXT NOT NULL,
    progress_rate DECIMAL(5,2) CHECK (progress_rate BETWEEN 0 AND 100),
    issues TEXT,
    tomorrow_plan TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'DRAFT'
        CHECK (status IN ('DRAFT','SUBMITTED','APPROVED','REJECTED')),
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMPTZ,
    ai_generated BOOLEAN NOT NULL DEFAULT FALSE,
    reporter_id UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    UNIQUE(project_id, report_date, reporter_id)
);
```
