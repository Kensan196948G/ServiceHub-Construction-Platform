# テーブル定義：原価管理

## costsテーブル

工事原価（費用）の実績データを管理するテーブル。

### DDL

```sql
CREATE TABLE costs (
    id              BIGSERIAL PRIMARY KEY,
    project_id      BIGINT NOT NULL REFERENCES projects(id),
    category        VARCHAR(50) NOT NULL
                    CHECK (category IN ('labor', 'material', 'equipment', 'subcontract', 'overhead', 'other')),
    subcategory     VARCHAR(100),
    description     VARCHAR(500) NOT NULL,
    supplier        VARCHAR(200),
    amount          BIGINT NOT NULL CHECK (amount >= 0),
    tax_rate        DECIMAL(4,3) NOT NULL DEFAULT 0.10,
    tax_amount      BIGINT GENERATED ALWAYS AS (amount * tax_rate::INTEGER) STORED,
    total_amount    BIGINT GENERATED ALWAYS AS (amount + amount * tax_rate::INTEGER) STORED,
    cost_date       DATE NOT NULL,
    invoice_number  VARCHAR(100),
    payment_date    DATE,
    payment_status  VARCHAR(20) NOT NULL DEFAULT 'unpaid'
                    CHECK (payment_status IN ('unpaid', 'pending', 'paid')),
    approval_status VARCHAR(20) NOT NULL DEFAULT 'pending'
                    CHECK (approval_status IN ('pending', 'approved', 'rejected')),
    approved_by     BIGINT REFERENCES users(id),
    approved_at     TIMESTAMP WITH TIME ZONE,
    notes           TEXT,
    receipt_photo_id BIGINT REFERENCES photos(id),
    created_by      BIGINT NOT NULL REFERENCES users(id),
    created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    deleted_at      TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_costs_project ON costs(project_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_costs_category ON costs(project_id, category);
CREATE INDEX idx_costs_date ON costs(cost_date);
CREATE INDEX idx_costs_approval ON costs(approval_status);
```

### カラム説明

| カラム名 | 型 | NULL | 説明 |
|---------|---|----|------|
| id | BIGSERIAL | NO | 主キー |
| project_id | BIGINT | NO | 案件ID（FK） |
| category | VARCHAR(50) | NO | 原価カテゴリ |
| subcategory | VARCHAR(100) | YES | サブカテゴリ |
| description | VARCHAR(500) | NO | 費用内容説明 |
| supplier | VARCHAR(200) | YES | 仕入先・業者名 |
| amount | BIGINT | NO | 税抜金額（円） |
| tax_rate | DECIMAL(4,3) | NO | 税率（デフォルト0.10） |
| tax_amount | BIGINT | NO | 消費税額（自動計算） |
| total_amount | BIGINT | NO | 税込総額（自動計算） |
| cost_date | DATE | NO | 発生日 |
| invoice_number | VARCHAR(100) | YES | 請求書番号 |
| payment_date | DATE | YES | 支払日 |
| payment_status | VARCHAR(20) | NO | 支払状況 |
| approval_status | VARCHAR(20) | NO | 承認状況 |

## project_budgetsテーブル

案件予算情報の管理テーブル。

```sql
CREATE TABLE project_budgets (
    id              BIGSERIAL PRIMARY KEY,
    project_id      BIGINT NOT NULL REFERENCES projects(id),
    budget_version  INTEGER NOT NULL DEFAULT 1,
    total_budget    BIGINT NOT NULL,
    labor_budget    BIGINT NOT NULL DEFAULT 0,
    material_budget BIGINT NOT NULL DEFAULT 0,
    equipment_budget BIGINT NOT NULL DEFAULT 0,
    subcontract_budget BIGINT NOT NULL DEFAULT 0,
    overhead_budget BIGINT NOT NULL DEFAULT 0,
    contingency_budget BIGINT NOT NULL DEFAULT 0,
    approved_by     BIGINT REFERENCES users(id),
    approved_at     TIMESTAMP WITH TIME ZONE,
    effective_date  DATE NOT NULL,
    notes           TEXT,
    created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
```

## timesheetsテーブル

作業工数（人工）の記録テーブル。

```sql
CREATE TABLE timesheets (
    id              BIGSERIAL PRIMARY KEY,
    project_id      BIGINT NOT NULL REFERENCES projects(id),
    user_id         BIGINT NOT NULL REFERENCES users(id),
    work_date       DATE NOT NULL,
    regular_hours   DECIMAL(4,1) NOT NULL DEFAULT 0 CHECK (regular_hours >= 0),
    overtime_hours  DECIMAL(4,1) NOT NULL DEFAULT 0 CHECK (overtime_hours >= 0),
    total_hours     DECIMAL(4,1) GENERATED ALWAYS AS (regular_hours + overtime_hours) STORED,
    hourly_rate     INTEGER,
    work_description TEXT,
    cost_category   VARCHAR(50) NOT NULL DEFAULT 'labor',
    approved        BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE(project_id, user_id, work_date)
);

CREATE INDEX idx_timesheets_project ON timesheets(project_id);
CREATE INDEX idx_timesheets_user ON timesheets(user_id);
CREATE INDEX idx_timesheets_date ON timesheets(work_date);
```

## 原価集計ビュー

```sql
CREATE VIEW project_cost_summary AS
SELECT 
    p.id AS project_id,
    p.name AS project_name,
    pb.total_budget,
    COALESCE(SUM(c.total_amount) FILTER (WHERE c.approval_status = 'approved'), 0) AS actual_cost,
    pb.total_budget - COALESCE(SUM(c.total_amount) FILTER (WHERE c.approval_status = 'approved'), 0) AS remaining_budget,
    ROUND(
        COALESCE(SUM(c.total_amount) FILTER (WHERE c.approval_status = 'approved'), 0)::DECIMAL 
        / NULLIF(pb.total_budget, 0) * 100, 1
    ) AS cost_rate
FROM projects p
LEFT JOIN project_budgets pb ON p.id = pb.project_id AND pb.budget_version = 1
LEFT JOIN costs c ON p.id = c.project_id AND c.deleted_at IS NULL
GROUP BY p.id, p.name, pb.total_budget;
```
