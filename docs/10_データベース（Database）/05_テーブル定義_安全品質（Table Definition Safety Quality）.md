# 🦺 テーブル定義：安全・品質（safety / quality）

## safety_ky_sheets テーブル（KYシート）

```sql
CREATE TABLE safety_ky_sheets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id),
    sheet_date DATE NOT NULL,
    work_content TEXT NOT NULL,
    hazards JSONB NOT NULL DEFAULT '[]',
    participants UUID[] DEFAULT '{}',
    supervisor_id UUID REFERENCES users(id),
    status VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);
```

## hazard_reports テーブル（ヒヤリハット）

```sql
CREATE TABLE hazard_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id),
    occurred_at TIMESTAMPTZ NOT NULL,
    location TEXT NOT NULL,
    description TEXT NOT NULL,
    cause TEXT,
    countermeasure TEXT,
    severity VARCHAR(20) NOT NULL DEFAULT 'LOW',
    photos UUID[] DEFAULT '{}',
    reporter_id UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);
```

## quality_inspections テーブル（品質検査記録）

```sql
CREATE TABLE quality_inspections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id),
    inspection_date DATE NOT NULL,
    inspection_type VARCHAR(50) NOT NULL,
    work_type VARCHAR(100) NOT NULL,
    result VARCHAR(20) NOT NULL DEFAULT 'PASS',
    issues TEXT,
    inspector_id UUID REFERENCES users(id),
    photos UUID[] DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);
```
