# Sprint 8: 帳票UI＋監視基盤構築

## 概要

| 項目 | 内容 |
|------|------|
| 期間 | 2026-07-13 〜 2026-07-26 |
| 工数 | 32時間（4日 × 8h） |
| テーマ | 帳票ダウンロードUIと Prometheus/Grafana 監視スタックの構築 |

## タスク一覧

### Day 1（8h）— 帳票ダウンロード UI

| # | タスク | 工数 |
|---|--------|------|
| 1.1 | Frontend: reports API クライアント作成（Blob ダウンロード対応） | 1.5h |
| 1.2 | 帳票一覧・ダウンロードページ実装（`/reports`） | 3h |
| 1.3 | 各ページに「PDF出力」「Excel出力」ボタン追加 | 2h |
| 1.4 | ダウンロード中のローディング表示 | 1.5h |

### Day 2（8h）— 帳票UI完成＋テスト

| # | タスク | 工数 |
|---|--------|------|
| 2.1 | プレビュー機能（PDF をブラウザ内表示） | 2h |
| 2.2 | 帳票パラメータ選択UI（日付範囲、プロジェクト選択） | 2h |
| 2.3 | 帳票UIコンポーネントのテスト | 2h |
| 2.4 | 全テスト実行・CI確認 | 2h |

### Day 3（8h）— Prometheus/Grafana 構築

| # | タスク | 工数 |
|---|--------|------|
| 3.1 | docker-compose.yml に Prometheus 追加 | 1.5h |
| 3.2 | docker-compose.yml に Grafana 追加 | 1.5h |
| 3.3 | docker-compose.yml に Node Exporter 追加 | 1h |
| 3.4 | Prometheus 設定ファイル作成（`monitoring/prometheus.yml`） | 1.5h |
| 3.5 | FastAPI に prometheus-fastapi-instrumentator 統合 | 1.5h |
| 3.6 | `/metrics` エンドポイント動作確認 | 1h |

### Day 4（8h）— 監視統合テスト

| # | タスク | 工数 |
|---|--------|------|
| 4.1 | Prometheus がメトリクス収集していることを確認 | 1.5h |
| 4.2 | Grafana データソース設定（Prometheus接続） | 1h |
| 4.3 | docker-compose.prod.yml に監視スタック追加 | 2h |
| 4.4 | 監視スタック起動・停止テスト | 1.5h |
| 4.5 | Sprint 8 振り返り | 1h |
| 4.6 | ドキュメント更新 | 1h |

## 成果物

- `frontend/src/pages/reports/ReportsPage.tsx` — 帳票一覧・ダウンロード
- `frontend/src/api/reports.ts` — 帳票APIクライアント
- `monitoring/prometheus.yml` — Prometheus 設定
- `monitoring/grafana/` — Grafana 設定・プロビジョニング
- docker-compose.yml（監視サービス追加版）

## STABLE判定条件

- 全4種帳票が Frontend からダウンロード可能
- Prometheus が FastAPI メトリクスを収集
- Grafana が起動しデータソース接続済み
- CI 全パイプライン成功
