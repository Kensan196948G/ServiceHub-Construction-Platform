# 📝 日報管理API（Daily Report API）

## エンドポイント一覧

| メソッド | パス | 説明 | 権限 |
|--------|------|------|------|
| GET | `/api/v1/daily-reports` | 日報一覧 | 全ロール |
| POST | `/api/v1/daily-reports` | 日報作成 | SITE以上 |
| GET | `/api/v1/daily-reports/{id}` | 日報詳細 | 全ロール |
| PUT | `/api/v1/daily-reports/{id}` | 日報更新 | 作成者・PM |
| POST | `/api/v1/daily-reports/{id}/approve` | 日報承認 | PM以上 |
| POST | `/api/v1/daily-reports/generate-from-voice` | 音声→日報生成 | SITE以上 |

## リクエスト例（日報作成）
```json
POST /api/v1/daily-reports
{
  "project_id": "uuid",
  "report_date": "2026-04-02",
  "weather": "晴れ",
  "workers_count": 15,
  "work_content": "基礎工事 コンクリート打設",
  "progress_rate": 35,
  "issues": "午後から雨のため作業遅延",
  "tomorrow_plan": "養生・型枠撤去",
  "reporter_id": "uuid"
}
```

## AI音声→日報変換
```json
POST /api/v1/daily-reports/generate-from-voice
{
  "audio_url": "s3://bucket/audio/report.mp3",
  "project_id": "uuid",
  "report_date": "2026-04-02"
}
```
レスポンス: 生成された日報ドラフトJSON
