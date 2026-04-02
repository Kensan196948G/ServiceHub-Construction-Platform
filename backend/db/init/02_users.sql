-- usersテーブル（認証・RBAC）
CREATE TABLE IF NOT EXISTS users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email           VARCHAR(255) NOT NULL UNIQUE,
    hashed_password VARCHAR(255) NOT NULL,
    full_name       VARCHAR(100) NOT NULL,
    role            VARCHAR(50)  NOT NULL DEFAULT 'VIEWER',
    is_active       BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ,
    last_login_at   TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS ix_users_email ON users(email);
CREATE INDEX IF NOT EXISTS ix_users_role  ON users(role);

CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 初期管理者ユーザー（パスワード: Admin1234! のbcryptハッシュ）
INSERT INTO users (email, hashed_password, full_name, role)
VALUES (
    'admin@servicehub.local',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4uq1CuYMW2',
    'システム管理者',
    'ADMIN'
) ON CONFLICT (email) DO NOTHING;
