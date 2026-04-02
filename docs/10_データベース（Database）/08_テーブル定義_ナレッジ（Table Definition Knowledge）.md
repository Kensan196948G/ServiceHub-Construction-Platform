# 📚 テーブル定義：ナレッジ・AI

## knowledge_articles テーブル

```sql
CREATE TABLE knowledge_articles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(500) NOT NULL,
    content TEXT NOT NULL,
    summary TEXT,
    category VARCHAR(100),
    tags TEXT[] DEFAULT '{}',
    project_id UUID REFERENCES projects(id),
    view_count INTEGER DEFAULT 0,
    like_count INTEGER DEFAULT 0,
    ai_generated BOOLEAN DEFAULT FALSE,
    embedding VECTOR(1536),
    author_id UUID NOT NULL REFERENCES users(id),
    published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_knowledge_embedding ON knowledge_articles USING ivfflat (embedding vector_cosine_ops);
CREATE INDEX idx_knowledge_tags ON knowledge_articles USING GIN(tags);
CREATE INDEX idx_knowledge_fts ON knowledge_articles USING GIN(to_tsvector('japanese', title || ' ' || content));
```

## ai_usage_logs テーブル（AI利用ログ・監査必須）

```sql
CREATE TABLE ai_usage_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    feature VARCHAR(100) NOT NULL,
    input_summary TEXT,
    output_summary TEXT,
    model_name VARCHAR(100),
    tokens_used INTEGER,
    response_time_ms INTEGER,
    success BOOLEAN NOT NULL DEFAULT TRUE,
    error_message TEXT,
    project_id UUID REFERENCES projects(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_ai_logs_user ON ai_usage_logs(user_id);
CREATE INDEX idx_ai_logs_created ON ai_usage_logs(created_at);
```
