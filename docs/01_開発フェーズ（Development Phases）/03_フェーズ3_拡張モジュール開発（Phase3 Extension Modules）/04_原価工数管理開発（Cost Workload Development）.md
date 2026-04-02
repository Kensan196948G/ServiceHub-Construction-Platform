# 原価・工数管理 開発設計

## 概要

原価・工数管理モジュールは、建設工事の予算管理・実績原価入力・工数集計・差異分析・レポート生成を担うモジュールである。工事案件の収益性を可視化し、経営判断に必要な原価データを適時に提供する。

---

## 機能一覧

| 機能ID | 機能名 | 優先度 | 説明 |
|-------|-------|--------|------|
| CS-001 | 予算管理 | 高 | 工事別・費目別予算の登録・管理 |
| CS-002 | 実績原価入力 | 高 | 日次実績原価の入力・管理 |
| CS-003 | 工数集計 | 高 | 日報からの工数自動集計 |
| CS-004 | 差異分析 | 高 | 予算対実績の差異計算・分析 |
| CS-005 | 月次レポート | 中 | 原価月次報告書の自動生成 |
| CS-006 | 予実管理ダッシュボード | 中 | 案件別予実グラフ表示 |
| CS-007 | 費目マスタ管理 | 中 | 原価費目の登録・管理 |
| CS-008 | 原価アラート | 低 | 予算超過時のアラート通知 |

---

## 原価費目体系

| 大分類 | 中分類 | 説明 |
|-------|-------|------|
| 労務費 | 直接労務費 | 現場作業員の人件費 |
| 労務費 | 間接労務費 | 現場監督・管理者の人件費 |
| 材料費 | 直接材料費 | コンクリート・鉄骨等の主要材料 |
| 材料費 | 間接材料費 | 消耗品・仮設材料 |
| 外注費 | 下請工事費 | 下請業者への支払い |
| 機械費 | 重機使用費 | クレーン・バックホウ等のリース費 |
| 経費 | 現場管理費 | 仮設事務所・光熱費・交通費 |
| 経費 | 保険料 | 工事保険・労災保険 |

---

## データモデル

### costs.budgets テーブル（予算）

```sql
CREATE TABLE costs.budgets (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id      UUID NOT NULL REFERENCES projects.projects(id),
    cost_category   VARCHAR(100) NOT NULL,          -- 費目
    budget_amount   DECIMAL(15,2) NOT NULL,          -- 予算金額
    fiscal_year     INTEGER NOT NULL,               -- 会計年度
    fiscal_month    INTEGER,                        -- 会計月（月次予算の場合）
    notes           TEXT,
    created_by      UUID REFERENCES auth.users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### costs.actual_costs テーブル（実績原価）

```sql
CREATE TABLE costs.actual_costs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id      UUID NOT NULL REFERENCES projects.projects(id),
    cost_date       DATE NOT NULL,
    cost_category   VARCHAR(100) NOT NULL,
    vendor_name     VARCHAR(200),                   -- 取引先名
    description     TEXT NOT NULL,
    amount          DECIMAL(15,2) NOT NULL,
    tax_rate        DECIMAL(4,2) NOT NULL DEFAULT 0.10,
    tax_amount      DECIMAL(15,2) NOT NULL,
    total_amount    DECIMAL(15,2) NOT NULL,
    invoice_number  VARCHAR(100),
    payment_date    DATE,
    input_by        UUID REFERENCES auth.users(id),
    approved_by     UUID REFERENCES auth.users(id),
    status          VARCHAR(50) NOT NULL DEFAULT 'pending',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_actual_costs_project ON costs.actual_costs(project_id);
CREATE INDEX idx_actual_costs_date ON costs.actual_costs(cost_date);
CREATE INDEX idx_actual_costs_category ON costs.actual_costs(cost_category);
```

---

## 差異分析ロジック

```python
from decimal import Decimal
from typing import List, Dict

def calculate_variance_analysis(project_id: str, db: Session) -> Dict:
    """予算対実績差異分析"""
    
    # 予算合計
    budget_total = db.query(func.sum(Budget.budget_amount)).filter(
        Budget.project_id == project_id
    ).scalar() or Decimal("0")
    
    # 実績原価合計
    actual_total = db.query(func.sum(ActualCost.total_amount)).filter(
        ActualCost.project_id == project_id,
        ActualCost.status == "approved"
    ).scalar() or Decimal("0")
    
    # 差異計算
    variance = budget_total - actual_total
    variance_rate = (variance / budget_total * 100) if budget_total > 0 else Decimal("0")
    
    # 完成時予測（EAC: Estimate At Completion）
    progress_rate = get_project_progress_rate(project_id, db)
    if progress_rate > 0:
        eac = actual_total / (progress_rate / 100)
    else:
        eac = budget_total
    
    return {
        "budget_total": float(budget_total),
        "actual_total": float(actual_total),
        "variance": float(variance),
        "variance_rate": float(variance_rate),
        "eac": float(eac),
        "status": "over_budget" if variance < 0 else "within_budget"
    }
```

---

## レポート生成

### 月次原価報告書の構成

1. **表紙**：案件名・作成日・報告期間
2. **サマリー**：予算・実績・差異・完成時予測（EAC）
3. **費目別内訳**：費目ごとの予算・実績・差異・進捗率
4. **月次推移グラフ**：累計実績と予算の推移グラフ
5. **大型取引明細**：50万円以上の個別取引明細
6. **工数集計**：日報から集計した作業員工数

---

## 予算アラート設定

| アラート種別 | 閾値 | 通知先 | 通知タイミング |
|-----------|-----|-------|-------------|
| 予算70%消化 | 70% | PM・原価担当 | 日次チェック時 |
| 予算90%消化 | 90% | PM・所長・経営 | 即時通知 |
| 予算超過 | 100%超 | PM・所長・経営 | 即時通知 |
| 月次予算超過 | 月次100%超 | PM・経理 | 月次締め時 |

---

## API設計

| メソッド | エンドポイント | 説明 |
|--------|------------|------|
| GET | /api/v1/projects/{id}/budgets | 予算一覧 |
| POST | /api/v1/projects/{id}/budgets | 予算登録 |
| GET | /api/v1/projects/{id}/actual-costs | 実績原価一覧 |
| POST | /api/v1/projects/{id}/actual-costs | 実績原価入力 |
| GET | /api/v1/projects/{id}/variance-analysis | 差異分析レポート |
| GET | /api/v1/projects/{id}/cost-report | 月次原価報告書（PDF） |
| GET | /api/v1/projects/{id}/work-hours | 工数集計 |
