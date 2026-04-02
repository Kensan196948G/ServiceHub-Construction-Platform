# 🖼️ テーブル定義：写真（photos）

## photos テーブル

| カラム名 | 型 | NULL | 説明 |
|---------|-----|------|------|
| id | UUID | NO | 主キー |
| project_id | UUID | NO | 案件ID (FK) |
| daily_report_id | UUID | YES | 日報ID (FK) |
| file_name | VARCHAR(255) | NO | ファイル名 |
| file_path | TEXT | NO | ストレージパス |
| file_size | BIGINT | NO | ファイルサイズ（bytes） |
| mime_type | VARCHAR(100) | NO | MIMEタイプ |
| category | VARCHAR(50) | NO | PROGRESS/SAFETY/QUALITY/OTHER |
| description | TEXT | YES | 説明 |
| taken_at | TIMESTAMPTZ | YES | 撮影日時 |
| location_lat | DECIMAL(10,7) | YES | 緯度 |
| location_lng | DECIMAL(10,7) | YES | 経度 |
| ai_tags | JSONB | YES | AIタグ（JSON配列） |
| thumbnail_path | TEXT | YES | サムネイルパス |
| uploaded_by | UUID | NO | アップロード者 |
| created_at | TIMESTAMPTZ | NO | 作成日時 |
| deleted_at | TIMESTAMPTZ | YES | 論理削除 |

## DDL
```sql
CREATE TABLE photos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id),
    daily_report_id UUID REFERENCES daily_reports(id),
    file_name VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    category VARCHAR(50) NOT NULL DEFAULT 'PROGRESS',
    description TEXT,
    taken_at TIMESTAMPTZ,
    location_lat DECIMAL(10,7),
    location_lng DECIMAL(10,7),
    ai_tags JSONB DEFAULT '[]',
    thumbnail_path TEXT,
    uploaded_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);
CREATE INDEX idx_photos_project ON photos(project_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_photos_ai_tags ON photos USING GIN(ai_tags);
```
