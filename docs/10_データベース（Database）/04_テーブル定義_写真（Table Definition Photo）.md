# テーブル定義：写真管理

## photosテーブル

工事現場の写真・資料ファイルを管理するテーブル。

### DDL

```sql
CREATE TABLE photos (
    id                  BIGSERIAL PRIMARY KEY,
    project_id          BIGINT NOT NULL REFERENCES projects(id),
    daily_report_id     BIGINT REFERENCES daily_reports(id),
    safety_check_id     BIGINT REFERENCES safety_checks(id),
    filename            VARCHAR(255) NOT NULL,
    original_filename   VARCHAR(255) NOT NULL,
    storage_path        VARCHAR(1000) NOT NULL,
    storage_bucket      VARCHAR(100) NOT NULL DEFAULT 'construction-photos',
    file_size           INTEGER NOT NULL CHECK (file_size > 0),
    mime_type           VARCHAR(100) NOT NULL,
    category            VARCHAR(50) NOT NULL DEFAULT 'progress'
                        CHECK (category IN ('progress', 'safety', 'quality', 'completion', 'incident', 'other')),
    description         TEXT,
    width               INTEGER,
    height              INTEGER,
    taken_at            TIMESTAMP WITH TIME ZONE,
    location_lat        DECIMAL(10, 8),
    location_lng        DECIMAL(11, 8),
    exif_data           JSONB DEFAULT '{}',
    ai_tags             TEXT[] DEFAULT '{}',
    ai_description      TEXT,
    thumbnail_path      VARCHAR(1000),
    is_public           BOOLEAN NOT NULL DEFAULT FALSE,
    tags                TEXT[] DEFAULT '{}',
    uploaded_by         BIGINT NOT NULL REFERENCES users(id),
    created_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    deleted_at          TIMESTAMP WITH TIME ZONE
);

-- インデックス
CREATE INDEX idx_photos_project ON photos(project_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_photos_category ON photos(project_id, category) WHERE deleted_at IS NULL;
CREATE INDEX idx_photos_taken_at ON photos(taken_at);
CREATE INDEX idx_photos_daily_report ON photos(daily_report_id) WHERE daily_report_id IS NOT NULL;
CREATE INDEX idx_photos_tags ON photos USING GIN(tags);
CREATE INDEX idx_photos_ai_tags ON photos USING GIN(ai_tags);
```

### カラム説明

| カラム名 | 型 | NULL | 説明 |
|---------|---|----|------|
| id | BIGSERIAL | NO | 主キー |
| project_id | BIGINT | NO | 案件ID（FK） |
| daily_report_id | BIGINT | YES | 日報ID（FK） |
| safety_check_id | BIGINT | YES | 安全チェックID（FK） |
| filename | VARCHAR(255) | NO | 保存ファイル名（UUID形式） |
| original_filename | VARCHAR(255) | NO | 元のファイル名 |
| storage_path | VARCHAR(1000) | NO | MinIOストレージパス |
| storage_bucket | VARCHAR(100) | NO | MinIOバケット名 |
| file_size | INTEGER | NO | ファイルサイズ（バイト） |
| mime_type | VARCHAR(100) | NO | MIMEタイプ |
| category | VARCHAR(50) | NO | 写真カテゴリ |
| description | TEXT | YES | 写真説明 |
| width | INTEGER | YES | 画像幅（px） |
| height | INTEGER | YES | 画像高さ（px） |
| taken_at | TIMESTAMPTZ | YES | 撮影日時（EXIF） |
| location_lat | DECIMAL(10,8) | YES | 緯度 |
| location_lng | DECIMAL(11,8) | YES | 経度 |
| exif_data | JSONB | NO | EXIFメタデータ |
| ai_tags | TEXT[] | NO | AI解析タグ |
| ai_description | TEXT | YES | AI生成説明文 |
| thumbnail_path | VARCHAR(1000) | YES | サムネイルパス |
| is_public | BOOLEAN | NO | 公開フラグ |
| tags | TEXT[] | NO | 手動タグ |
| uploaded_by | BIGINT | NO | アップロード者ID |

## photo_albumsテーブル

写真をグループ化するアルバム機能。

```sql
CREATE TABLE photo_albums (
    id          BIGSERIAL PRIMARY KEY,
    project_id  BIGINT NOT NULL REFERENCES projects(id),
    name        VARCHAR(200) NOT NULL,
    description TEXT,
    cover_photo_id BIGINT REFERENCES photos(id),
    created_by  BIGINT NOT NULL REFERENCES users(id),
    created_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE photo_album_items (
    album_id    BIGINT NOT NULL REFERENCES photo_albums(id) ON DELETE CASCADE,
    photo_id    BIGINT NOT NULL REFERENCES photos(id) ON DELETE CASCADE,
    sort_order  INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (album_id, photo_id)
);
```

## ストレージパス規則

```
construction-photos/
├── {year}/
│   ├── {month}/
│   │   ├── {project_id}/
│   │   │   ├── original/{uuid}.jpg
│   │   │   └── thumbnail/{uuid}_thumb.jpg
```
