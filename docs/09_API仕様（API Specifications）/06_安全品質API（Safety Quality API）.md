# 🦺 安全・品質API（Safety Quality API）

## 安全管理 エンドポイント

| メソッド | パス | 説明 |
|--------|------|------|
| GET/POST | `/api/v1/safety/ky-sheets` | KYシート管理 |
| GET/POST | `/api/v1/safety/hazard-reports` | ヒヤリハット |
| GET/POST | `/api/v1/safety/patrol-records` | 安全パトロール |
| GET | `/api/v1/safety/disaster-cases` | 災害事例検索 |

## 品質管理 エンドポイント

| メソッド | パス | 説明 |
|--------|------|------|
| GET/POST | `/api/v1/quality/inspections` | 検査記録 |
| GET/PUT | `/api/v1/quality/corrections/{id}` | 是正指示 |
| GET/POST | `/api/v1/quality/checklists` | 品質チェックリスト |
| GET | `/api/v1/quality/dashboard/{project_id}` | 品質ダッシュボード |

## KYシート作成例
```json
POST /api/v1/safety/ky-sheets
{
  "project_id": "uuid",
  "date": "2026-04-02",
  "work_content": "高所作業（足場設置）",
  "hazards": [
    {"risk": "転落", "countermeasure": "安全帯使用・手すり設置"},
    {"risk": "落下物", "countermeasure": "ネット設置・立入禁止区域設定"}
  ],
  "participants": ["uuid1", "uuid2"],
  "supervisor_id": "uuid"
}
```
