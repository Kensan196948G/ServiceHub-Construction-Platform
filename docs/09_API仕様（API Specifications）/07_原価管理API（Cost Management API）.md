# 原価管理API仕様

## 概要
工事原価・工数管理に関するAPI仕様を定義する。予算対実績の管理と原価分析機能を提供。

## エンドポイント一覧

| メソッド | エンドポイント | 説明 | 権限 |
|---------|-------------|------|------|
| GET | /projects/{id}/budget | 予算情報取得 | cost:read |
| PUT | /projects/{id}/budget | 予算更新 | cost:write |
| GET | /projects/{id}/costs | 原価一覧 | cost:read |
| POST | /projects/{id}/costs | 原価登録 | cost:write |
| PUT | /costs/{id} | 原価更新 | cost:write |
| DELETE | /costs/{id} | 原価削除 | cost:delete |
| GET | /projects/{id}/cost-summary | 原価サマリー | cost:read |
| GET | /projects/{id}/cost-forecast | 原価予測 | cost:read |
| GET | /projects/{id}/timesheets | 工数一覧 | cost:read |
| POST | /projects/{id}/timesheets | 工数登録 | cost:write |

## GET /projects/{id}/cost-summary

### レスポンス
```json
{
  "success": true,
  "data": {
    "project_id": 1,
    "period": "2026-04",
    "budget": {
      "total": 50000000,
      "labor": 20000000,
      "material": 25000000,
      "equipment": 3000000,
      "overhead": 2000000
    },
    "actual": {
      "total": 18500000,
      "labor": 7200000,
      "material": 9800000,
      "equipment": 1100000,
      "overhead": 400000
    },
    "committed": {
      "total": 12000000,
      "material": 11000000,
      "equipment": 1000000
    },
    "variance": {
      "total": -500000,
      "percentage": -2.6,
      "status": "over_budget"
    },
    "earned_value": {
      "planned_value": 17500000,
      "earned_value": 18000000,
      "actual_cost": 18500000,
      "spi": 1.03,
      "cpi": 0.97
    },
    "as_of_date": "2026-04-15"
  }
}
```

## POST /projects/{id}/costs

### リクエスト
```json
{
  "category": "material",
  "subcategory": "コンクリート",
  "description": "基礎コンクリート材料費",
  "supplier": "○○建材株式会社",
  "amount": 1500000,
  "tax_rate": 0.10,
  "cost_date": "2026-04-15",
  "invoice_number": "INV-2026-1234",
  "approval_required": true,
  "notes": "打設量50m³分"
}
```

## POST /projects/{id}/timesheets

### リクエスト
```json
{
  "work_date": "2026-04-15",
  "user_id": 12,
  "regular_hours": 8.0,
  "overtime_hours": 1.5,
  "work_description": "基礎コンクリート打設作業",
  "cost_category": "labor"
}
```

## EVM（アーンドバリュー管理）指標

| 指標 | 算式 | 意味 |
|------|------|------|
| PV (Planned Value) | 計画値 | 計画上の完了すべき作業価値 |
| EV (Earned Value) | 出来高 | 実際に完了した作業価値 |
| AC (Actual Cost) | 実コスト | 実際に発生したコスト |
| CPI | EV / AC | コスト効率指数（>1: 良好） |
| SPI | EV / PV | スケジュール効率指数（>1: 良好） |
| EAC | AC + (BAC - EV) / CPI | 完成時コスト予測 |

## 原価カテゴリ

| カテゴリ | サブカテゴリ例 |
|---------|-------------|
| labor | 直接労務費、間接労務費 |
| material | コンクリート、鉄筋、木材、仕上材 |
| equipment | 重機リース、小工具 |
| subcontract | 電気、設備、外構 |
| overhead | 現場管理費、交通費 |

## GET /projects/{id}/cost-forecast

AIによる原価予測を提供。

### レスポンス
```json
{
  "success": true,
  "data": {
    "forecast_date": "2026-04-15",
    "completion_cost_forecast": 52300000,
    "variance_forecast": 2300000,
    "confidence_interval": {
      "lower": 50500000,
      "upper": 54800000
    },
    "risk_factors": [
      "材料費高騰トレンド",
      "工期遅延リスク"
    ],
    "model": "gpt-4o + historical_data"
  }
}
```
