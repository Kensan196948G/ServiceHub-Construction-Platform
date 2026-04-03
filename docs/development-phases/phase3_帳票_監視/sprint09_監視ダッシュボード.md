# Sprint 9: 監視ダッシュボード＋アラート設定

## 概要

| 項目 | 内容 |
|------|------|
| 期間 | 2026-07-27 〜 2026-08-09 |
| 工数 | 32時間（4日 × 8h） |
| テーマ | Grafana ダッシュボード構築とアラート設定、Phase 3 総括 |

## Grafana ダッシュボード設計

docs/05_運用設計/06_監視設計.md の設計に基づき実装する。

### ダッシュボード構成（4枚）

| # | ダッシュボード | パネル数 | 主要メトリクス |
|---|-------------|---------|--------------|
| 1 | サービス概要 | 8 | HTTPリクエスト数、レスポンスタイム P50/P95/P99、エラー率 |
| 2 | インフラ | 6 | CPU、メモリ、ディスク、ネットワーク |
| 3 | データベース | 5 | コネクション数、クエリ時間、デッドロック |
| 4 | ビジネスKPI | 5 | アクティブユーザー数、日報提出数、プロジェクト稼働数 |

## タスク一覧

### Day 1（8h）— サービス概要＋インフラダッシュボード

| # | タスク | 工数 |
|---|--------|------|
| 1.1 | Grafana ダッシュボード: サービス概要（HTTPメトリクス） | 3h |
| 1.2 | Grafana ダッシュボード: インフラ（Node Exporter） | 2.5h |
| 1.3 | ダッシュボードJSON をプロビジョニング設定に追加 | 1.5h |
| 1.4 | Grafana 起動時の自動プロビジョニング確認 | 1h |

### Day 2（8h）— DB＋ビジネスKPIダッシュボード

| # | タスク | 工数 |
|---|--------|------|
| 2.1 | postgres_exporter の追加（Docker Compose） | 1.5h |
| 2.2 | Grafana ダッシュボード: データベース | 2.5h |
| 2.3 | カスタムメトリクス実装（ビジネスKPI用） | 2h |
| 2.4 | Grafana ダッシュボード: ビジネスKPI | 2h |

### Day 3（8h）— Alertmanager＋アラートルール

| # | タスク | 工数 |
|---|--------|------|
| 3.1 | Alertmanager の Docker Compose 追加 | 1h |
| 3.2 | Alertmanager 設定ファイル作成 | 1.5h |
| 3.3 | Prometheus アラートルール定義 | 2.5h |
| 3.4 | アラート動作テスト | 2h |
| 3.5 | アラートルールドキュメント化 | 1h |

### アラートルール

| ルール名 | 条件 | 重要度 |
|---------|------|--------|
| HighErrorRate | 5xxエラー率 > 2%（5分間） | critical |
| SlowAPIResponse | P95レスポンス > 1000ms（5分間） | warning |
| HighCPUUsage | CPU使用率 > 90%（5分間） | warning |
| HighMemoryUsage | メモリ使用率 > 90%（5分間） | critical |
| DatabaseConnectionExhausted | コネクション > 90% | critical |
| DiskSpaceLow | ディスク使用率 > 85% | warning |

### Day 4（8h）— 統合テスト＋Phase 3 総括

| # | タスク | 工数 |
|---|--------|------|
| 4.1 | 全監視スタックの統合テスト（起動→メトリクス収集→アラート） | 2h |
| 4.2 | 帳票機能の最終確認 | 1.5h |
| 4.3 | 全テスト実行・CI確認・STABLE判定 | 1.5h |
| 4.4 | Phase 3 完了レポート作成 | 1h |
| 4.5 | 監視運用マニュアル作成 | 1h |
| 4.6 | Phase 4 準備 | 1h |

## 成果物

- `monitoring/grafana/dashboards/` — 4枚のダッシュボードJSON
- `monitoring/grafana/provisioning/` — データソース・ダッシュボード自動設定
- `monitoring/alertmanager.yml` — Alertmanager 設定
- `monitoring/prometheus/rules/` — アラートルール
- 監視運用マニュアル
- Phase 3 完了レポート

## STABLE判定条件

- Grafana 4ダッシュボードが自動プロビジョニングで表示
- Prometheus がアプリ・インフラ・DBメトリクスを収集
- アラートルールが設定済み
- 帳票4種が正常動作
- 全テスト PASS、CI成功
- **STABLE N=3**
