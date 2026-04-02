# テーブル定義：安全品質管理

## safety_checksテーブル

工事現場の安全確認チェックシートを管理するテーブル。

### DDL

```sql
CREATE TABLE safety_checks (
    id                      BIGSERIAL PRIMARY KEY,
    project_id              BIGINT NOT NULL REFERENCES projects(id),
    check_date              DATE NOT NULL,
    check_type              VARCHAR(50) NOT NULL DEFAULT 'daily'
                            CHECK (check_type IN ('daily', 'weekly', 'monthly', 'special')),
    checklist_template_id   BIGINT REFERENCES checklist_templates(id),
    overall_status          VARCHAR(30) NOT NULL DEFAULT 'ok'
                            CHECK (overall_status IN ('ok', 'requires_action', 'critical')),
    ng_count                SMALLINT NOT NULL DEFAULT 0,
    ok_count                SMALLINT NOT NULL DEFAULT 0,
    na_count                SMALLINT NOT NULL DEFAULT 0,
    notes                   TEXT,
    status                  VARCHAR(20) NOT NULL DEFAULT 'draft'
                            CHECK (status IN ('draft', 'submitted', 'approved')),
    submitted_at            TIMESTAMP WITH TIME ZONE,
    approved_at             TIMESTAMP WITH TIME ZONE,
    approved_by             BIGINT REFERENCES users(id),
    inspector_id            BIGINT NOT NULL REFERENCES users(id),
    created_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_safety_checks_project ON safety_checks(project_id);
CREATE INDEX idx_safety_checks_date ON safety_checks(check_date);
CREATE INDEX idx_safety_checks_status ON safety_checks(status);
```

## safety_check_itemsテーブル

チェックシートの各項目記録。

```sql
CREATE TABLE safety_check_items (
    id                  BIGSERIAL PRIMARY KEY,
    safety_check_id     BIGINT NOT NULL REFERENCES safety_checks(id) ON DELETE CASCADE,
    category            VARCHAR(100) NOT NULL,
    item_name           VARCHAR(300) NOT NULL,
    result              VARCHAR(10) NOT NULL CHECK (result IN ('OK', 'NG', 'NA')),
    notes               TEXT,
    corrective_action   TEXT,
    corrective_deadline DATE,
    corrective_done_at  TIMESTAMP WITH TIME ZONE,
    sort_order          SMALLINT NOT NULL DEFAULT 0
);
```

## incidentsテーブル

安全インシデント（事故・ヒヤリハット）管理テーブル。

```sql
CREATE TABLE incidents (
    id                  BIGSERIAL PRIMARY KEY,
    project_id          BIGINT NOT NULL REFERENCES projects(id),
    incident_date       DATE NOT NULL,
    incident_time       TIME,
    type                VARCHAR(50) NOT NULL
                        CHECK (type IN ('near_miss', 'minor_injury', 'serious_injury', 'fatality', 'property_damage')),
    severity            VARCHAR(20) NOT NULL
                        CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    location            VARCHAR(300),
    description         TEXT NOT NULL,
    immediate_actions   TEXT,
    root_cause          TEXT,
    preventive_measures TEXT,
    status              VARCHAR(30) NOT NULL DEFAULT 'open'
                        CHECK (status IN ('open', 'investigating', 'resolved', 'closed')),
    resolved_at         TIMESTAMP WITH TIME ZONE,
    reported_by         BIGINT NOT NULL REFERENCES users(id),
    created_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_incidents_project ON incidents(project_id);
CREATE INDEX idx_incidents_date ON incidents(incident_date);
CREATE INDEX idx_incidents_type ON incidents(type);
CREATE INDEX idx_incidents_severity ON incidents(severity);
```

## quality_checksテーブル

品質検査記録テーブル。

```sql
CREATE TABLE quality_checks (
    id                  BIGSERIAL PRIMARY KEY,
    project_id          BIGINT NOT NULL REFERENCES projects(id),
    check_date          DATE NOT NULL,
    work_category       VARCHAR(100) NOT NULL,
    inspection_type     VARCHAR(100) NOT NULL,
    inspector_id        BIGINT NOT NULL REFERENCES users(id),
    result              VARCHAR(20) NOT NULL CHECK (result IN ('pass', 'fail', 'conditional_pass')),
    measured_value      DECIMAL(10,3),
    standard_value      DECIMAL(10,3),
    unit                VARCHAR(30),
    notes               TEXT,
    defect_description  TEXT,
    corrective_required BOOLEAN NOT NULL DEFAULT FALSE,
    created_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
```

## チェックリストテンプレート

```sql
CREATE TABLE checklist_templates (
    id          BIGSERIAL PRIMARY KEY,
    name        VARCHAR(200) NOT NULL,
    check_type  VARCHAR(50) NOT NULL,
    version     VARCHAR(20) NOT NULL DEFAULT '1.0',
    is_active   BOOLEAN NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE checklist_template_items (
    id              BIGSERIAL PRIMARY KEY,
    template_id     BIGINT NOT NULL REFERENCES checklist_templates(id),
    category        VARCHAR(100) NOT NULL,
    item_name       VARCHAR(300) NOT NULL,
    is_required     BOOLEAN NOT NULL DEFAULT TRUE,
    sort_order      SMALLINT NOT NULL DEFAULT 0
);
```
