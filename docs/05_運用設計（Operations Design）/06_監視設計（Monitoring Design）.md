# 監視設計

## 概要

本ドキュメントでは、ServiceHub Construction Platform の監視設計を定義する。Prometheus + Grafana によるメトリクス監視、Loki によるログ監視、Alertmanager によるアラート管理を実装する。

---

## 監視スタック

| ツール | 役割 | 収集間隔 |
|-------|------|---------|
| Prometheus | メトリクス収集・保管 | 15秒 |
| Grafana | メトリクス可視化・ダッシュボード | - |
| Loki | ログ収集・検索 | リアルタイム |
| Alertmanager | アラート管理・通知 | - |
| Blackbox Exporter | 外形監視（HTTP/TCP） | 30秒 |
| Node Exporter | サーバーリソース監視 | 15秒 |
| postgres_exporter | PostgreSQL監視 | 30秒 |

---

## 監視項目一覧

### インフラ監視

| 監視項目 | 閾値（警告） | 閾値（重大） |
|---------|-----------|-----------|
| CPU使用率 | ≥70% | ≥90% |
| メモリ使用率 | ≥70% | ≥90% |
| ディスク使用率 | ≥75% | ≥90% |
| ネットワークエラー率 | ≥0.1% | ≥1% |

### アプリケーション監視

| 監視項目 | 閾値（警告） | 閾値（重大） |
|---------|-----------|-----------|
| HTTPエラー率（5xx） | ≥0.5% | ≥2% |
| APIレスポンス時間（P95） | ≥300ms | ≥1000ms |
| アクティブ接続数 | ≥80 | ≥100 |
| Celeryキュー積滞数 | ≥100 | ≥500 |

### DB監視

| 監視項目 | 閾値（警告） | 閾値（重大） |
|---------|-----------|-----------|
| DB接続プール使用率 | ≥70% | ≥90% |
| スロークエリ（>1秒） | ≥5件/分 | ≥20件/分 |
| レプリケーション遅延 | ≥10秒 | ≥60秒 |
| デッドロック発生率 | ≥1件/時 | ≥10件/時 |

---

## Prometheusアラートルール例

```yaml
groups:
  - name: servicehub_alerts
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.02
        for: 5m
        labels:
          severity: critical
          service: servicehub
        annotations:
          summary: "HTTPエラー率が高い"
          description: "エラー率が2%を超えています（現在: {{ $value }}）"

      - alert: SlowAPIResponse
        expr: histogram_quantile(0.95, http_request_duration_seconds_bucket) > 1.0
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "APIレスポンスが遅い"
          description: "P95レスポンス時間が1秒を超えています"

      - alert: DatabaseConnectionPoolExhausted
        expr: pg_stat_database_numbackends / pg_settings_max_connections > 0.9
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "DB接続プールが枯渇しそう"
```

---

## アラート通知設定

| アラートレベル | 通知方法 | 通知先 |
|------------|-------|------|
| INFO | Slackチャンネル通知 | #monitoring |
| WARNING | Slack通知 | #alerts |
| CRITICAL | Slack + メール + 電話 | オンコール担当者 |

---

## Grafanaダッシュボード構成

| ダッシュボード名 | 主要パネル |
|-------------|---------|
| サービス概要 | 稼働率・エラー率・レスポンス時間 |
| インフラ | CPU・メモリ・ディスク使用率 |
| アプリケーション | API呼び出し数・エラー・レイテンシ |
| データベース | クエリ数・スロークエリ・接続数 |
| ビジネスKPI | 日報提出数・案件数・ユーザーアクティビティ |
