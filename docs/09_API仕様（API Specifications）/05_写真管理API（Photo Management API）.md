# 写真管理API仕様

## 概要
工事現場の写真・資料ファイルのアップロード・管理に関するAPI仕様を定義する。MinIOを使ったファイルストレージと統合。

## エンドポイント一覧

| メソッド | エンドポイント | 説明 | 権限 |
|---------|-------------|------|------|
| GET | /projects/{id}/photos | 写真一覧取得 | photo:read |
| POST | /projects/{id}/photos | 写真アップロード | photo:write |
| GET | /photos/{id} | 写真詳細取得 | photo:read |
| PUT | /photos/{id} | 写真情報更新 | photo:write |
| DELETE | /photos/{id} | 写真削除 | photo:delete |
| GET | /photos/{id}/download | 写真ダウンロード | photo:read |
| POST | /projects/{id}/photos/bulk-upload | 一括アップロード | photo:write |
| GET | /projects/{id}/photos/categories | カテゴリ一覧 | photo:read |

## POST /projects/{id}/photos

マルチパートフォームデータでファイルをアップロード。

### リクエスト (multipart/form-data)
```
file: (binary) 写真ファイル (JPEG/PNG/HEIC, 最大50MB)
category: "progress"  # 工程/安全/品質/完成
description: "1階基礎コンクリート打設状況"
taken_at: "2026-04-15T10:30:00+09:00"
location_lat: 35.6812
location_lng: 139.7671
tags: ["基礎工事", "コンクリート"]
daily_report_id: 128
```

### レスポンス (201 Created)
```json
{
  "success": true,
  "data": {
    "id": 345,
    "project_id": 1,
    "filename": "IMG_20260415_103045.jpg",
    "original_filename": "photo.jpg",
    "file_size": 2456789,
    "mime_type": "image/jpeg",
    "category": "progress",
    "description": "1階基礎コンクリート打設状況",
    "url": "https://storage.servicehub.example.com/photos/2026/04/uuid.jpg",
    "thumbnail_url": "https://storage.servicehub.example.com/thumbs/2026/04/uuid_thumb.jpg",
    "width": 3024,
    "height": 4032,
    "taken_at": "2026-04-15T10:30:00+09:00",
    "location": {
      "lat": 35.6812,
      "lng": 139.7671
    },
    "uploaded_by": {
      "id": 3,
      "name": "鈴木一郎"
    },
    "created_at": "2026-04-15T18:45:00+09:00"
  }
}
```

## 写真カテゴリ

| カテゴリ | 説明 | 保存期間 |
|---------|------|---------|
| progress | 工程写真 | 10年 |
| safety | 安全管理写真 | 5年 |
| quality | 品質管理写真 | 10年 |
| completion | 完成写真 | 永久 |
| incident | インシデント写真 | 7年 |
| other | その他 | 5年 |

## 画像処理仕様

アップロード後に非同期でCeleryジョブが実行：

```python
# Celeryタスク例
@celery_app.task
async def process_uploaded_photo(photo_id: int):
    photo = await Photo.get(photo_id)
    
    # サムネイル生成（320x240）
    thumbnail = await generate_thumbnail(photo, 320, 240)
    
    # EXIF情報抽出
    exif_data = await extract_exif(photo)
    
    # AI画像解析（オプション）
    analysis = await analyze_photo_content(photo)
    
    # メタデータ更新
    await photo.update(
        thumbnail_url=thumbnail.url,
        exif_data=exif_data,
        ai_tags=analysis.tags
    )
```

## POST /projects/{id}/photos/bulk-upload

### リクエスト (multipart/form-data)
```
files[]: (binary) 最大10ファイル同時
category: "progress"
daily_report_id: 128
```

### レスポンス (202 Accepted)
```json
{
  "success": true,
  "data": {
    "job_id": "bulk-upload-job-uuid",
    "total_files": 8,
    "status": "processing",
    "status_url": "/api/v1/jobs/bulk-upload-job-uuid"
  }
}
```

## GET /photos/{id}/download

### レスポンス
- `200 OK`: ファイルバイナリ（Content-Type: image/jpeg等）
- 署名付きURLへのリダイレクト（302）も可
- 有効期限: 1時間
