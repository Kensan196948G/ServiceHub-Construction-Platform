# テーブル定義：ナレッジ管理

## knowledge_articlesテーブル

ナレッジベースの記事を管理するメインテーブル。

### DDL

```sql
CREATE TABLE knowledge_articles (
    id              BIGSERIAL PRIMARY KEY,
    title           VARCHAR(300) NOT NULL,
    content         TEXT NOT NULL,
    summary         VARCHAR(500),
    category        VARCHAR(100) NOT NULL,
    subcategory     VARCHAR(100),
    status          VARCHAR(20) NOT NULL DEFAULT 'draft'
                    CHECK (status IN ('draft', 'review', 'published', 'archived')),
    visibility      VARCHAR(20) NOT NULL DEFAULT 'internal'
                    CHECK (visibility IN ('public', 'internal', 'restricted')),
    tags            TEXT[] DEFAULT '{}',
    related_article_ids BIGINT[] DEFAULT '{}',
    view_count      INTEGER NOT NULL DEFAULT 0,
    like_count      INTEGER NOT NULL DEFAULT 0,
    helpful_count   INTEGER NOT NULL DEFAULT 0,
    not_helpful_count INTEGER NOT NULL DEFAULT 0,
    author_id       BIGINT NOT NULL REFERENCES users(id),
    reviewer_id     BIGINT REFERENCES users(id),
    reviewed_at     TIMESTAMP WITH TIME ZONE,
    published_at    TIMESTAMP WITH TIME ZONE,
    last_reviewed_at TIMESTAMP WITH TIME ZONE,
    review_interval  INTEGER DEFAULT 365,
    next_review_date DATE,
    elasticsearch_id VARCHAR(100),
    version         INTEGER NOT NULL DEFAULT 1,
    created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    deleted_at      TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_knowledge_status ON knowledge_articles(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_knowledge_category ON knowledge_articles(category);
CREATE INDEX idx_knowledge_tags ON knowledge_articles USING GIN(tags);
CREATE INDEX idx_knowledge_author ON knowledge_articles(author_id);
CREATE INDEX idx_knowledge_published ON knowledge_articles(published_at) WHERE status = 'published';
```

### カテゴリ一覧

| カテゴリ | 説明 |
|---------|------|
| 施工管理 | 施工手順・方法 |
| 安全管理 | 安全対策・規程 |
| 品質管理 | 品質基準・検査方法 |
| 原価管理 | コスト管理手法 |
| IT/システム | システム操作方法 |
| 法規・規制 | 建設業法・各種規制 |
| トラブルシューティング | 問題解決事例 |
| ベストプラクティス | 成功事例・ノウハウ |

## knowledge_article_versionsテーブル

記事のバージョン履歴管理テーブル。

```sql
CREATE TABLE knowledge_article_versions (
    id          BIGSERIAL PRIMARY KEY,
    article_id  BIGINT NOT NULL REFERENCES knowledge_articles(id) ON DELETE CASCADE,
    version     INTEGER NOT NULL,
    title       VARCHAR(300) NOT NULL,
    content     TEXT NOT NULL,
    change_summary VARCHAR(500),
    edited_by   BIGINT NOT NULL REFERENCES users(id),
    created_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE(article_id, version)
);
```

## ai_chat_sessionsテーブル

AI会話セッションの管理テーブル。

```sql
CREATE TABLE ai_chat_sessions (
    id              BIGSERIAL PRIMARY KEY,
    session_uuid    UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
    user_id         BIGINT NOT NULL REFERENCES users(id),
    project_id      BIGINT REFERENCES projects(id),
    title           VARCHAR(300),
    total_tokens    INTEGER NOT NULL DEFAULT 0,
    message_count   INTEGER NOT NULL DEFAULT 0,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE ai_chat_messages (
    id          BIGSERIAL PRIMARY KEY,
    session_id  BIGINT NOT NULL REFERENCES ai_chat_sessions(id) ON DELETE CASCADE,
    role        VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content     TEXT NOT NULL,
    tokens      INTEGER,
    model       VARCHAR(100),
    latency_ms  INTEGER,
    created_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_chat_sessions_user ON ai_chat_sessions(user_id);
CREATE INDEX idx_chat_messages_session ON ai_chat_messages(session_id);
```

## ai_usage_logsテーブル

AI機能の利用ログ・コスト管理テーブル。

```sql
CREATE TABLE ai_usage_logs (
    id              BIGSERIAL PRIMARY KEY,
    user_id         BIGINT NOT NULL REFERENCES users(id),
    feature         VARCHAR(100) NOT NULL,
    model           VARCHAR(100) NOT NULL,
    prompt_tokens   INTEGER NOT NULL,
    completion_tokens INTEGER NOT NULL,
    total_tokens    INTEGER NOT NULL,
    estimated_cost  DECIMAL(10, 6),
    latency_ms      INTEGER,
    success         BOOLEAN NOT NULL DEFAULT TRUE,
    error_message   TEXT,
    created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ai_usage_user ON ai_usage_logs(user_id, created_at);
CREATE INDEX idx_ai_usage_feature ON ai_usage_logs(feature, created_at);
```
