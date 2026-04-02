# テーブル定義：ITSM管理

## itsm_incidentsテーブル

ITサービスマネジメントのインシデント管理テーブル。

### DDL

```sql
CREATE TABLE itsm_incidents (
    id              BIGSERIAL PRIMARY KEY,
    ticket_number   VARCHAR(50) UNIQUE NOT NULL,
    title           VARCHAR(300) NOT NULL,
    description     TEXT NOT NULL,
    category        VARCHAR(100) NOT NULL,
    priority        VARCHAR(20) NOT NULL
                    CHECK (priority IN ('critical', 'high', 'medium', 'low')),
    impact          VARCHAR(20) NOT NULL
                    CHECK (impact IN ('critical', 'high', 'medium', 'low')),
    urgency         VARCHAR(20) NOT NULL
                    CHECK (urgency IN ('critical', 'high', 'medium', 'low')),
    status          VARCHAR(30) NOT NULL DEFAULT 'open'
                    CHECK (status IN ('open', 'in_progress', 'pending', 'resolved', 'closed')),
    affected_system VARCHAR(200),
    workaround      TEXT,
    resolution      TEXT,
    reporter_id     BIGINT NOT NULL REFERENCES users(id),
    assigned_to     BIGINT REFERENCES users(id),
    escalated_to    BIGINT REFERENCES users(id),
    sla_deadline    TIMESTAMP WITH TIME ZONE,
    resolved_at     TIMESTAMP WITH TIME ZONE,
    closed_at       TIMESTAMP WITH TIME ZONE,
    problem_id      BIGINT REFERENCES itsm_problems(id),
    created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_itsm_incidents_status ON itsm_incidents(status);
CREATE INDEX idx_itsm_incidents_priority ON itsm_incidents(priority);
CREATE INDEX idx_itsm_incidents_assigned ON itsm_incidents(assigned_to);
CREATE INDEX idx_itsm_incidents_sla ON itsm_incidents(sla_deadline) WHERE status NOT IN ('resolved', 'closed');
```

### SLA自動設定トリガー

```sql
CREATE OR REPLACE FUNCTION set_incident_sla()
RETURNS TRIGGER AS $$
BEGIN
    NEW.sla_deadline := CASE NEW.priority
        WHEN 'critical' THEN NOW() + INTERVAL '4 hours'
        WHEN 'high'     THEN NOW() + INTERVAL '8 hours'
        WHEN 'medium'   THEN NOW() + INTERVAL '24 hours'
        WHEN 'low'      THEN NOW() + INTERVAL '72 hours'
    END;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_set_incident_sla
    BEFORE INSERT ON itsm_incidents
    FOR EACH ROW EXECUTE FUNCTION set_incident_sla();
```

## itsm_problemsテーブル

根本原因分析（RCA）を管理する問題管理テーブル。

```sql
CREATE TABLE itsm_problems (
    id              BIGSERIAL PRIMARY KEY,
    ticket_number   VARCHAR(50) UNIQUE NOT NULL,
    title           VARCHAR(300) NOT NULL,
    description     TEXT NOT NULL,
    status          VARCHAR(30) NOT NULL DEFAULT 'open'
                    CHECK (status IN ('open', 'investigating', 'known_error', 'resolved', 'closed')),
    root_cause      TEXT,
    workaround      TEXT,
    resolution      TEXT,
    owner_id        BIGINT NOT NULL REFERENCES users(id),
    resolved_at     TIMESTAMP WITH TIME ZONE,
    created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
```

## itsm_changesテーブル

変更要求（RFC）管理テーブル。

```sql
CREATE TABLE itsm_changes (
    id                      BIGSERIAL PRIMARY KEY,
    ticket_number           VARCHAR(50) UNIQUE NOT NULL,
    title                   VARCHAR(300) NOT NULL,
    description             TEXT NOT NULL,
    change_type             VARCHAR(30) NOT NULL
                            CHECK (change_type IN ('standard', 'normal', 'emergency')),
    risk_level              VARCHAR(20) NOT NULL
                            CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
    status                  VARCHAR(30) NOT NULL DEFAULT 'submitted'
                            CHECK (status IN ('submitted', 'reviewing', 'approved', 'rejected', 'implementing', 'completed', 'failed')),
    impact_assessment       TEXT,
    rollback_plan           TEXT NOT NULL,
    implementation_date     TIMESTAMP WITH TIME ZONE,
    downtime_required       BOOLEAN NOT NULL DEFAULT FALSE,
    downtime_duration       INTEGER,
    actual_start            TIMESTAMP WITH TIME ZONE,
    actual_end              TIMESTAMP WITH TIME ZONE,
    implementation_result   TEXT,
    requester_id            BIGINT NOT NULL REFERENCES users(id),
    implementer_id          BIGINT REFERENCES users(id),
    created_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
```

## itsm_change_approvalsテーブル

変更承認履歴テーブル。

```sql
CREATE TABLE itsm_change_approvals (
    id          BIGSERIAL PRIMARY KEY,
    change_id   BIGINT NOT NULL REFERENCES itsm_changes(id) ON DELETE CASCADE,
    approver_id BIGINT NOT NULL REFERENCES users(id),
    decision    VARCHAR(20) NOT NULL CHECK (decision IN ('approved', 'rejected', 'pending')),
    comments    TEXT,
    decided_at  TIMESTAMP WITH TIME ZONE,
    created_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
```

## itsm_incident_commentsテーブル

インシデントへのコメント・対応記録。

```sql
CREATE TABLE itsm_incident_comments (
    id          BIGSERIAL PRIMARY KEY,
    incident_id BIGINT NOT NULL REFERENCES itsm_incidents(id) ON DELETE CASCADE,
    author_id   BIGINT NOT NULL REFERENCES users(id),
    content     TEXT NOT NULL,
    is_internal BOOLEAN NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_incident_comments ON itsm_incident_comments(incident_id);
```
