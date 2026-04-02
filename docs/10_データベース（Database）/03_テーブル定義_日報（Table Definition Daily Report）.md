# テーブル定義：日報管理

## daily_reportsテーブル

工事現場の作業日報を管理するテーブル。

### DDL

```sql
CREATE TABLE daily_reports (
    id                  BIGSERIAL PRIMARY KEY,
    project_id          BIGINT NOT NULL REFERENCES projects(id),
    report_date         DATE NOT NULL,
    weather             VARCHAR(20),
    temperature         DECIMAL(4,1),
    work_description    TEXT NOT NULL,
    workers_count       SMALLINT NOT NULL CHECK (workers_count > 0),
    work_hours          DECIMAL(4,1),
    progress_rate       SMALLINT CHECK (progress_rate BETWEEN 0 AND 100),
    tomorrow_plan       TEXT,
    notes               TEXT,
    status              VARCHAR(20) NOT NULL DEFAULT 'draft'
                        CHECK (status IN ('draft', 'submitted', 'approved', 'rejected')),
    submitted_at        TIMESTAMP WITH TIME ZONE,
    approved_at         TIMESTAMP WITH TIME ZONE,
    approved_by         BIGINT REFERENCES users(id),
    rejected_reason     TEXT,
    ai_summary          TEXT,
    ai_keywords         TEXT[] DEFAULT '{}',
    author_id           BIGINT NOT NULL REFERENCES users(id),
    created_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    deleted_at          TIMESTAMP WITH TIME ZONE,
    UNIQUE(project_id, report_date, author_id)
);

CREATE INDEX idx_daily_reports_project ON daily_reports(project_id);
CREATE INDEX idx_daily_reports_date ON daily_reports(report_date);
CREATE INDEX idx_daily_reports_status ON daily_reports(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_daily_reports_author ON daily_reports(author_id);
```

### カラム説明

| カラム名 | 型 | NULL | 説明 |
|---------|---|----|------|
| id | BIGSERIAL | NO | 主キー |
| project_id | BIGINT | NO | 案件ID（FK） |
| report_date | DATE | NO | 報告日 |
| weather | VARCHAR(20) | YES | 天候（晴れ/曇り/雨/雪） |
| temperature | DECIMAL(4,1) | YES | 気温（℃） |
| work_description | TEXT | NO | 作業内容（50文字以上） |
| workers_count | SMALLINT | NO | 作業員数 |
| work_hours | DECIMAL(4,1) | YES | 作業時間 |
| progress_rate | SMALLINT | YES | 進捗率（%） |
| tomorrow_plan | TEXT | YES | 翌日の作業予定 |
| notes | TEXT | YES | 備考・特記事項 |
| status | VARCHAR(20) | NO | 承認ステータス |
| submitted_at | TIMESTAMPTZ | YES | 提出日時 |
| approved_at | TIMESTAMPTZ | YES | 承認日時 |
| approved_by | BIGINT | YES | 承認者ID |
| rejected_reason | TEXT | YES | 差し戻し理由 |
| ai_summary | TEXT | YES | AI生成要約 |
| ai_keywords | TEXT[] | NO | AIキーワード |
| author_id | BIGINT | NO | 作成者ID |

## daily_report_safety_itemsテーブル

日報に紐づく安全確認項目。

```sql
CREATE TABLE daily_report_safety_items (
    id              BIGSERIAL PRIMARY KEY,
    daily_report_id BIGINT NOT NULL REFERENCES daily_reports(id) ON DELETE CASCADE,
    item_name       VARCHAR(200) NOT NULL,
    result          VARCHAR(10) NOT NULL CHECK (result IN ('OK', 'NG', 'NA')),
    notes           TEXT,
    created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
```

## 日報承認フロー制約

```sql
-- 提出済み日報は作成者以外が編集不可
CREATE OR REPLACE FUNCTION check_report_edit_permission()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status IN ('submitted', 'approved') 
       AND NEW.work_description != OLD.work_description THEN
        RAISE EXCEPTION '提出済みまたは承認済みの日報は編集できません';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```
