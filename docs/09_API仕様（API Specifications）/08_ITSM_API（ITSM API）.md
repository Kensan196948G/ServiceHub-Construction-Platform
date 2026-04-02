# ITSM API仕様

## 概要
ITサービスマネジメント（ITSM）機能（インシデント・問題・変更管理）に関するAPI仕様を定義する。

## エンドポイント一覧

| メソッド | エンドポイント | 説明 | 権限 |
|---------|-------------|------|------|
| GET | /itsm/incidents | インシデント一覧 | itsm:read |
| POST | /itsm/incidents | インシデント作成 | itsm:write |
| GET | /itsm/incidents/{id} | インシデント詳細 | itsm:read |
| PUT | /itsm/incidents/{id} | インシデント更新 | itsm:write |
| POST | /itsm/incidents/{id}/assign | 担当者アサイン | itsm:manage |
| POST | /itsm/incidents/{id}/resolve | 解決 | itsm:write |
| POST | /itsm/incidents/{id}/close | クローズ | itsm:write |
| GET | /itsm/problems | 問題一覧 | itsm:read |
| POST | /itsm/problems | 問題作成 | itsm:write |
| GET | /itsm/changes | 変更要求一覧 | itsm:read |
| POST | /itsm/changes | 変更要求作成 | itsm:write |
| POST | /itsm/changes/{id}/approve | 変更承認 | itsm:approve |

## POST /itsm/incidents

### リクエスト
```json
{
  "title": "本番環境でAPIレスポンスが遅い",
  "description": "案件管理APIの一覧取得が30秒以上かかる状態が発生している",
  "category": "performance",
  "priority": "high",
  "impact": "medium",
  "urgency": "high",
  "affected_system": "案件管理API",
  "reporter_id": 5,
  "assigned_to": null,
  "workaround": "キャッシュをクリアすると一時的に解消"
}
```

### レスポンス (201 Created)
```json
{
  "success": true,
  "data": {
    "id": 234,
    "ticket_number": "INC-2026-0234",
    "title": "本番環境でAPIレスポンスが遅い",
    "status": "open",
    "priority": "high",
    "created_at": "2026-04-15T10:30:00+09:00",
    "sla_deadline": "2026-04-15T14:30:00+09:00"
  }
}
```

## インシデント優先度とSLA

| 優先度 | 応答時間 | 解決時間 | 通知先 |
|--------|---------|---------|--------|
| critical | 15分以内 | 4時間以内 | CTO・全チーム |
| high | 30分以内 | 8時間以内 | リーダー・担当 |
| medium | 2時間以内 | 24時間以内 | 担当チーム |
| low | 8時間以内 | 72時間以内 | 担当者 |

## POST /itsm/changes

### リクエスト
```json
{
  "title": "PostgreSQLインデックス追加による性能改善",
  "description": "案件テーブルのstatus+created_atカラムに複合インデックスを追加",
  "change_type": "standard",
  "risk_level": "low",
  "impact_assessment": "読み取り性能向上、書き込み微細な低下",
  "rollback_plan": "インデックスをDROPすることで即時ロールバック可能",
  "implementation_date": "2026-04-20T02:00:00+09:00",
  "downtime_required": false,
  "approvers": [5, 7]
}
```

## 変更タイプ

| タイプ | 説明 | 承認プロセス |
|--------|------|-----------|
| standard | 低リスク・定型的変更 | 1名承認 |
| normal | 通常変更 | CAB承認 |
| emergency | 緊急変更 | ECAB即時承認 |
| unauthorized | 未承認変更 | 事後レビュー |

## GET /itsm/incidents のクエリパラメータ

| パラメータ | 説明 |
|----------|------|
| status | open/in_progress/resolved/closed |
| priority | critical/high/medium/low |
| assigned_to | 担当者ID |
| category | performance/security/availability等 |
| from_date | 作成日from |
| to_date | 作成日to |
