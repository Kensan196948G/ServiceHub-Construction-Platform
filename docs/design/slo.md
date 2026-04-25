# ServiceHub Construction Platform — SLO 定義書

**Phase 9b 策定 / 2026-04-25**

## 1. SLO 目標値

| 指標 | SLO 目標 | 計測方法 | アラート閾値 |
|---|---|---|---|
| **可用性** | 99.9% / 月 | `/health/live` 疎通率 | < 99.5% → critical |
| **P95 レイテンシ** | < 1000ms @ 100 RPS | `http_request_duration_seconds` Histogram | > 1s → warning / > 3s → critical |
| **P99 レイテンシ** | < 3000ms | 同上 | > 3s → warning |
| **エラー率 (5xx)** | < 2% | `http_requests_total{status=~"5.."}` | > 2% → critical |
| **スループット** | 最低 50 RPS を維持 | `rate(http_requests_total[5m])` | < 10 RPS → warning |

## 2. エンドポイント別 SLO

| カテゴリ | エンドポイント | P95 目標 |
|---|---|---|
| 死活確認 | `GET /health/live` / `GET /health/ready` | < 100ms |
| 認証 | `POST /api/v1/auth/login` / `/auth/refresh` | < 500ms |
| 案件管理 | `GET /api/v1/projects/` | < 800ms |
| 原価管理 | `GET /api/v1/costs/summary` | < 1000ms |
| 安全管理 | `GET /api/v1/safety-checks/` | < 1000ms |
| 通知 | `GET /api/v1/notifications/` | < 800ms |
| ユーザー管理 | `GET /api/v1/users/` | < 500ms |

## 3. 負荷テストシナリオ

### 3.1 SLO 検証テスト (`k6_slo_test.js`)

```
Smoke (2 VU, 30s)
  └─ 基本疎通確認 (health/live, health/ready)

SLO Load (0→100 VU ramp, 2min sustain)
  └─ P95 < 1000ms
  └─ Error rate < 2%
  └─ 全主要エンドポイント網羅
```

### 3.2 スパイクテスト (`k6_spike_test.js`)

```
Baseline (10 VU, 10s)
  → Spike (200 VU, 10s ramp + 60s sustain)
  → Recovery (10 VU, 60s)

Acceptance:
  - Spike中エラー率 < 5%
  - Recovery P95 < 1000ms (回復確認)
```

### 3.3 全エンドポイントカバレッジ (`k6_endpoints_test.js`)

```
Ramping (0→20 VU, 100s total)
  └─ 7エンドポイントグループを順次呼び出し
  └─ 各エンドポイント個別 P95 計測
```

### 3.4 既存負荷テスト (`k6_load.js`)

```
health_check (5 VU, 30s constant)
api_load (0→20→0 VU ramping, 2min)
  └─ ログイン → 案件一覧 → ヘルス フロー
```

## 4. CI 組み込み

| トリガー | 実行スクリプト | 目的 |
|---|---|---|
| main push / 週次 Monday 09:00 JST | `k6_load.js` + `k6_slo_test.js` | SLO 継続確認 |
| `performance/**` 変更時 | 全 k6 スクリプト | 変更影響確認 |
| 手動 (`workflow_dispatch`) | 全スクリプト | スポット検証 |

## 5. Prometheus / Grafana 連携

Phase 9a で構築した監視スタックとの連携:

| k6 メトリクス | Grafana パネル | アラートルール |
|---|---|---|
| `http_req_duration` p95 | P95 Latency Stat / Timeseries | `APIHighLatencyP95` |
| `http_req_failed` rate | Error Rate Stat | `APIHighErrorRate` |
| `http_reqs` rate | Request Rate (RPS) Stat | — |
| `slo_error_rate` | — (k6 summary のみ) | — |

## 6. SLO 違反時の対応フロー

```
アラート発火 (Alertmanager)
  ↓
on-call エンジニア確認 (PagerDuty / Slack 未設定の場合はメール)
  ↓
Grafana ダッシュボードで原因特定
  ↓
ホットフィックス or スケールアウト判断
  ↓
5xx 原因の場合: 直近デプロイのロールバック検討
  ↓
インシデント記録 → Postmortem
```

## 7. エラーバジェット

月間 SLO 99.9% の場合:

| 期間 | 許容ダウンタイム |
|---|---|
| 月次 | 約 43 分 |
| 週次 | 約 10 分 |
| 日次 | 約 86 秒 |

エラーバジェット 50% 消費時: 新機能デプロイ停止 / 安定化優先。

---

*このドキュメントは Phase 9b で策定。Phase 9c (Kubernetes) 導入後に HPA 閾値と合わせて更新予定。*
