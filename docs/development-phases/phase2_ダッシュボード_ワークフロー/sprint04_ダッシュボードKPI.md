# Sprint 4: ダッシュボード KPI・グラフ実装

## 概要

| 項目 | 内容 |
|------|------|
| 期間 | 2026-05-18 〜 2026-05-31 |
| 工数 | 32時間（4日 × 8h） |
| テーマ | 経営・現場判断に必要なKPIをダッシュボードに集約表示 |

## KPI設計

### 表示するKPI（5カテゴリ）

| # | KPI | データソース | グラフ種別 |
|---|-----|-------------|-----------|
| 1 | プロジェクト進捗サマリー | projects テーブル | 円グラフ（ステータス別） |
| 2 | 月次原価推移 | cost_records テーブル | 折れ線グラフ（予算 vs 実績） |
| 3 | 安全チェック完了率 | safety_checks テーブル | 棒グラフ（月別） |
| 4 | インシデント発生推移 | incidents テーブル | 折れ線グラフ + 棒グラフ |
| 5 | 日報提出率 | daily_reports テーブル | エリアチャート（週別） |

## タスク一覧

### Day 1（8h）— Backend KPI API

| # | タスク | 工数 |
|---|--------|------|
| 1.1 | KPI集計用 API エンドポイント設計 | 1h |
| 1.2 | `GET /api/v1/dashboard/summary` — 全体サマリーAPI | 2h |
| 1.3 | `GET /api/v1/dashboard/cost-trend` — 原価推移API | 2h |
| 1.4 | `GET /api/v1/dashboard/safety-stats` — 安全統計API | 2h |
| 1.5 | KPI API テスト作成 | 1h |

### Day 2（8h）— Backend KPI API続き＋Frontend準備

| # | タスク | 工数 |
|---|--------|------|
| 2.1 | `GET /api/v1/dashboard/incident-trend` — インシデント推移API | 2h |
| 2.2 | `GET /api/v1/dashboard/report-rate` — 日報提出率API | 2h |
| 2.3 | Frontend: dashboard API クライアント作成 | 1h |
| 2.4 | Frontend: Recharts 共通グラフコンポーネント設計 | 2h |
| 2.5 | Backend KPI API 全テスト実行 | 1h |

### Day 3（8h）— Frontend グラフ実装

| # | タスク | 工数 |
|---|--------|------|
| 3.1 | KPIカードコンポーネント（数値 + 前期比 + トレンド矢印） | 2h |
| 3.2 | 円グラフ: プロジェクトステータス分布 | 1.5h |
| 3.3 | 折れ線グラフ: 原価推移（予算 vs 実績） | 1.5h |
| 3.4 | 棒グラフ: 安全チェック完了率 | 1.5h |
| 3.5 | 複合グラフ: インシデント推移 | 1.5h |

### Day 4（8h）— 統合＋テスト

| # | タスク | 工数 |
|---|--------|------|
| 4.1 | エリアチャート: 日報提出率 | 1h |
| 4.2 | DashboardPage リファクタリング（KPIセクション統合） | 2h |
| 4.3 | 日付範囲フィルター（月次/四半期/年次切替） | 1.5h |
| 4.4 | Frontend グラフコンポーネントのテスト | 1.5h |
| 4.5 | 全テスト実行・CI確認 | 1h |
| 4.6 | Sprint 4 振り返り | 1h |

## 成果物

- `backend/app/api/v1/endpoints/dashboard.py` — KPI 集計API（5エンドポイント）
- `frontend/src/api/dashboard.ts` — ダッシュボードAPIクライアント
- `frontend/src/components/charts/` — Recharts ラッパーコンポーネント群
- `frontend/src/components/dashboard/` — KPIカード、フィルター

## STABLE判定条件

- KPI API 5エンドポイント全て動作
- 5種グラフがダッシュボードに表示
- Backend テスト PASS
- Frontend ビルド成功
