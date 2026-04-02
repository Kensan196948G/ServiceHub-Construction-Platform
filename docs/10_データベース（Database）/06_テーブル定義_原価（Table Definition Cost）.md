# 💰 テーブル定義：原価（cost_entries / workloads）

## cost_entries テーブル（原価入力）

```sql
CREATE TABLE cost_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id),
    entry_date DATE NOT NULL,
    category VARCHAR(50) NOT NULL
        CHECK (category IN ('MATERIAL','LABOR','SUBCONTRACT','EQUIPMENT','OVERHEAD')),
    item_name VARCHAR(200) NOT NULL,
    quantity DECIMAL(12,3),
    unit VARCHAR(20),
    unit_price BIGINT,
    total_amount BIGINT NOT NULL,
    vendor VARCHAR(200),
    invoice_no VARCHAR(100),
    note TEXT,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);
CREATE INDEX idx_cost_entries_project ON cost_entries(project_id) WHERE deleted_at IS NULL;
```

## project_budgets テーブル（予算管理）

```sql
CREATE TABLE project_budgets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) UNIQUE,
    total_budget BIGINT NOT NULL,
    material_budget BIGINT DEFAULT 0,
    labor_budget BIGINT DEFAULT 0,
    subcontract_budget BIGINT DEFAULT 0,
    equipment_budget BIGINT DEFAULT 0,
    overhead_budget BIGINT DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

## workloads テーブル（工数記録）

```sql
CREATE TABLE workloads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id),
    worker_id UUID NOT NULL REFERENCES users(id),
    work_date DATE NOT NULL,
    work_hours DECIMAL(4,2) NOT NULL CHECK (work_hours > 0),
    work_type VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```
