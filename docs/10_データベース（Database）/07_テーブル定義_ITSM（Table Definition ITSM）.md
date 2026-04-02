# 🏛️ テーブル定義：ITSM

## itsm_incidents テーブル

```sql
CREATE TABLE itsm_incidents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(300) NOT NULL,
    description TEXT NOT NULL,
    priority VARCHAR(20) NOT NULL DEFAULT 'MEDIUM'
        CHECK (priority IN ('CRITICAL','HIGH','MEDIUM','LOW')),
    status VARCHAR(30) NOT NULL DEFAULT 'OPEN'
        CHECK (status IN ('OPEN','IN_PROGRESS','RESOLVED','CLOSED','CANCELLED')),
    category VARCHAR(50),
    affected_services TEXT[],
    reporter_id UUID NOT NULL REFERENCES users(id),
    assignee_id UUID REFERENCES users(id),
    resolved_at TIMESTAMPTZ,
    closed_at TIMESTAMPTZ,
    sla_deadline TIMESTAMPTZ,
    sla_violated BOOLEAN DEFAULT FALSE,
    problem_id UUID REFERENCES itsm_problems(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

## itsm_changes テーブル

```sql
CREATE TABLE itsm_changes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(300) NOT NULL,
    description TEXT NOT NULL,
    change_type VARCHAR(20) NOT NULL DEFAULT 'NORMAL'
        CHECK (change_type IN ('STANDARD','NORMAL','EMERGENCY')),
    status VARCHAR(30) NOT NULL DEFAULT 'SUBMITTED',
    risk_level VARCHAR(20) DEFAULT 'LOW',
    planned_start TIMESTAMPTZ,
    planned_end TIMESTAMPTZ,
    actual_start TIMESTAMPTZ,
    actual_end TIMESTAMPTZ,
    requester_id UUID NOT NULL REFERENCES users(id),
    approver_id UUID REFERENCES users(id),
    approved_at TIMESTAMPTZ,
    rollback_plan TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```
