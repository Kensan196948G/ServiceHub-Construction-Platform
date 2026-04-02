# 🏛️ ITSM API（ITSM API）

## エンドポイント一覧

### インシデント管理
| メソッド | パス | 説明 |
|--------|------|------|
| GET/POST | `/api/v1/itsm/incidents` | インシデント一覧・作成 |
| GET/PUT | `/api/v1/itsm/incidents/{id}` | 詳細・更新 |
| POST | `/api/v1/itsm/incidents/{id}/escalate` | エスカレーション |
| POST | `/api/v1/itsm/incidents/{id}/resolve` | 解決 |

### 問題管理
| メソッド | パス | 説明 |
|--------|------|------|
| GET/POST | `/api/v1/itsm/problems` | 問題管理 |
| PUT | `/api/v1/itsm/problems/{id}/rca` | RCA登録 |

### 変更管理
| メソッド | パス | 説明 |
|--------|------|------|
| GET/POST | `/api/v1/itsm/changes` | 変更申請 |
| PUT | `/api/v1/itsm/changes/{id}/approve` | 承認 |
| PUT | `/api/v1/itsm/changes/{id}/implement` | 実装完了 |

### SLA管理
| メソッド | パス | 説明 |
|--------|------|------|
| GET | `/api/v1/itsm/sla/violations` | SLA違反一覧 |
| GET | `/api/v1/itsm/sla/dashboard` | SLAダッシュボード |

## インシデント作成例
```json
POST /api/v1/itsm/incidents
{
  "title": "本番APIサーバー応答遅延",
  "description": "APIレスポンスが5秒超過",
  "priority": "HIGH",
  "category": "PERFORMANCE",
  "reporter_id": "uuid",
  "affected_services": ["api-server"]
}
```
