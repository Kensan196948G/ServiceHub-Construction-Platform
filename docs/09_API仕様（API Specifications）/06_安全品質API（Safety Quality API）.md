# 安全品質管理API仕様

## 概要
工事現場の安全管理・品質チェックに関するAPI仕様を定義する。

## エンドポイント一覧

| メソッド | エンドポイント | 説明 | 権限 |
|---------|-------------|------|------|
| GET | /projects/{id}/safety-checks | 安全チェック一覧 | safety:read |
| POST | /projects/{id}/safety-checks | 安全チェック作成 | safety:write |
| GET | /safety-checks/{id} | 安全チェック詳細 | safety:read |
| PUT | /safety-checks/{id} | 安全チェック更新 | safety:write |
| POST | /safety-checks/{id}/submit | 提出 | safety:write |
| POST | /safety-checks/{id}/approve | 承認 | safety:approve |
| GET | /projects/{id}/incidents | インシデント一覧 | safety:read |
| POST | /projects/{id}/incidents | インシデント報告 | safety:write |
| GET | /incidents/{id} | インシデント詳細 | safety:read |
| PUT | /incidents/{id}/resolve | インシデント解決 | safety:approve |
| GET | /projects/{id}/quality-checks | 品質チェック一覧 | quality:read |
| POST | /projects/{id}/quality-checks | 品質チェック作成 | quality:write |

## POST /projects/{id}/safety-checks

### リクエスト
```json
{
  "check_date": "2026-04-15",
  "check_type": "daily",
  "items": [
    {
      "category": "足場",
      "item": "足場の緊結状態確認",
      "result": "OK",
      "notes": ""
    },
    {
      "category": "電気",
      "item": "仮設電気の絶縁確認",
      "result": "NG",
      "notes": "配線の一部に損傷あり。要修繕。",
      "corrective_action": "電気工事業者に連絡し本日中に修繕予定",
      "corrective_deadline": "2026-04-15"
    }
  ],
  "overall_status": "requires_action",
  "checklist_template_id": 3
}
```

### レスポンス (201 Created)
```json
{
  "success": true,
  "data": {
    "id": 78,
    "check_date": "2026-04-15",
    "check_type": "daily",
    "status": "draft",
    "ng_count": 1,
    "ok_count": 10,
    "na_count": 2
  }
}
```

## POST /projects/{id}/incidents

### リクエスト
```json
{
  "incident_date": "2026-04-15",
  "incident_time": "14:30",
  "type": "near_miss",
  "severity": "medium",
  "location": "1階作業エリア",
  "description": "重機旋回時に作業員が接近。ニアミス発生。",
  "involved_workers": [
    {"id": 12, "name": "田村健太"}
  ],
  "immediate_actions": "作業一時停止、安全確認実施",
  "root_cause": "誘導員の配置不足",
  "preventive_measures": "重機作業時の誘導員2名配置を義務化"
}
```

## インシデント種別・重大度

| 種別 | 説明 | 報告期限 |
|------|------|---------|
| near_miss | ヒヤリハット | 当日中 |
| minor_injury | 軽傷 | 当日中 |
| serious_injury | 重傷 | 即時 |
| fatality | 死亡 | 即時 |
| property_damage | 物損 | 翌日 |

## 品質チェック結果統計 GET /projects/{id}/quality-stats

### レスポンス
```json
{
  "success": true,
  "data": {
    "period": "2026-04",
    "total_checks": 45,
    "pass_rate": 95.6,
    "defect_items": [
      {"category": "コンクリート強度", "count": 2},
      {"category": "鉄筋配置", "count": 0}
    ],
    "trend": [
      {"date": "2026-04-01", "pass_rate": 93.0},
      {"date": "2026-04-15", "pass_rate": 95.6}
    ]
  }
}
```
