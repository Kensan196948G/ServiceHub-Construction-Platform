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

-- ============================================
-- 初期デモユーザー（パスワード: Admin123!）
-- bcrypt hash: $2b$12$HKXNvMoWrEQKvd9chifSq.9xJHiBQ9gpnnKFkXECW3u.4MWqwPwCS
-- ============================================
INSERT INTO users (email, hashed_password, full_name, role) VALUES
    ('admin@example.com',      '$2b$12$HKXNvMoWrEQKvd9chifSq.9xJHiBQ9gpnnKFkXECW3u.4MWqwPwCS', 'システム管理者',  'ADMIN'),
    ('pm@example.com',         '$2b$12$HKXNvMoWrEQKvd9chifSq.9xJHiBQ9gpnnKFkXECW3u.4MWqwPwCS', '工事部長 田中',    'PROJECT_MANAGER'),
    ('supervisor@example.com', '$2b$12$HKXNvMoWrEQKvd9chifSq.9xJHiBQ9gpnnKFkXECW3u.4MWqwPwCS', '現場監督 鈴木',    'SITE_SUPERVISOR'),
    ('cost@example.com',       '$2b$12$HKXNvMoWrEQKvd9chifSq.9xJHiBQ9gpnnKFkXECW3u.4MWqwPwCS', '原価管理 山田',    'COST_MANAGER'),
    ('safety@example.com',     '$2b$12$HKXNvMoWrEQKvd9chifSq.9xJHiBQ9gpnnKFkXECW3u.4MWqwPwCS', '安全管理 高橋',    'SAFETY_OFFICER'),
    ('itop@example.com',       '$2b$12$HKXNvMoWrEQKvd9chifSq.9xJHiBQ9gpnnKFkXECW3u.4MWqwPwCS', 'IT運用 佐藤',      'IT_OPERATOR'),
    ('viewer@example.com',     '$2b$12$HKXNvMoWrEQKvd9chifSq.9xJHiBQ9gpnnKFkXECW3u.4MWqwPwCS', '閲覧ユーザー',    'VIEWER')
ON CONFLICT (email) DO NOTHING;
