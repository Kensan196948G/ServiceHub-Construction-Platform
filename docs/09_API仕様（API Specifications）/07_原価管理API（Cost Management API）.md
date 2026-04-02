# 💰 原価管理API（Cost Management API）

## エンドポイント一覧

| メソッド | パス | 説明 |
|--------|------|------|
| GET | `/api/v1/costs/projects/{id}` | 案件別原価集計 |
| GET/POST | `/api/v1/costs/entries` | 原価入力 |
| GET | `/api/v1/costs/budget/{project_id}` | 予算管理 |
| GET/POST | `/api/v1/workloads` | 工数管理 |
| GET | `/api/v1/costs/dashboard/{project_id}` | 原価ダッシュボード |
| GET | `/api/v1/costs/alerts` | 赤字予兆アラート |
| GET | `/api/v1/costs/reports/{project_id}` | 原価レポート |

## 原価入力例
```json
POST /api/v1/costs/entries
{
  "project_id": "uuid",
  "category": "MATERIAL",
  "item_name": "生コンクリート",
  "quantity": 50,
  "unit": "m3",
  "unit_price": 15000,
  "total_amount": 750000,
  "entry_date": "2026-04-02",
  "vendor": "○○生コン株式会社"
}
```

## 原価カテゴリ
| コード | 説明 |
|--------|------|
| MATERIAL | 材料費 |
| LABOR | 労務費 |
| SUBCONTRACT | 外注費 |
| EQUIPMENT | 機械経費 |
| OVERHEAD | 現場経費 |
