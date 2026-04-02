# 性能テスト計画

## 概要

本計画書は、ServiceHub Construction Platform の性能テストの計画を定義する。本番環境と同等のスペックで負荷テストを実施し、性能目標を達成することを確認する。

---

## 性能目標

| 指標 | 目標値 | 測定方法 |
|-----|--------|---------|
| APIレスポンス時間（P50） | ≤100ms | k6 |
| APIレスポンス時間（P95） | ≤200ms | k6 |
| APIレスポンス時間（P99） | ≤500ms | k6 |
| 同時接続ユーザー数 | 100名 | Locust |
| スループット | ≥500 req/s | k6 |
| エラー率 | ≤0.1% | k6 |
| CPU使用率（負荷時） | ≤70% | Prometheus |
| メモリ使用率（負荷時） | ≤80% | Prometheus |

---

## テスト種別

| 種別 | 目的 | 実施日程 |
|-----|------|---------|
| ベースラインテスト | 通常負荷での基準値計測 | 2026/08/11 |
| 負荷テスト | 100名同時接続での性能確認 | 2026/08/12〜13 |
| ストレステスト | システム限界値の特定 | 2026/08/14 |
| スパイクテスト | 急激な負荷増加への対応確認 | 2026/08/15 |
| 耐久テスト | 8時間連続稼働での安定性確認 | 2026/08/18〜19 |

---

## 使用ツール

| ツール | 用途 | バージョン |
|-------|------|---------|
| k6 | 負荷テスト・APIテスト | 0.50.x |
| Locust | 同時接続テスト | 2.x |
| Prometheus | メトリクス収集 | 2.x |
| Grafana | メトリクス可視化 | 10.x |
| New Relic APM | アプリケーション性能監視 | - |

---

## k6 テストスクリプト例

```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '2m', target: 10 },   // ランプアップ
    { duration: '5m', target: 50 },   // 中程度の負荷
    { duration: '5m', target: 100 },  // ピーク負荷
    { duration: '2m', target: 0 },    // ランプダウン
  ],
  thresholds: {
    http_req_duration: ['p(95)<200', 'p(99)<500'],
    http_req_failed: ['rate<0.001'],
  },
};

const BASE_URL = 'https://perf.servicehub.internal';

export default function () {
  // 認証
  const loginRes = http.post(`${BASE_URL}/api/v1/auth/token`, {
    username: 'test_user@example.com',
    password: 'test_password'
  });
  
  check(loginRes, {
    'login status 200': (r) => r.status === 200,
    'login time < 500ms': (r) => r.timings.duration < 500,
  });
  
  const token = loginRes.json('access_token');
  const headers = { Authorization: `Bearer ${token}` };
  
  // 案件一覧取得
  const projectsRes = http.get(`${BASE_URL}/api/v1/projects`, { headers });
  check(projectsRes, {
    'projects status 200': (r) => r.status === 200,
    'projects time < 200ms': (r) => r.timings.duration < 200,
  });
  
  sleep(1);
}
```

---

## Locust テストスクリプト例

```python
from locust import HttpUser, task, between

class ServiceHubUser(HttpUser):
    wait_time = between(1, 3)
    
    def on_start(self):
        response = self.client.post("/api/v1/auth/token", data={
            "username": "test@example.com",
            "password": "testpassword"
        })
        self.token = response.json()["access_token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    @task(5)
    def get_projects(self):
        self.client.get("/api/v1/projects", headers=self.headers)
    
    @task(3)
    def get_daily_reports(self):
        self.client.get("/api/v1/daily-reports", headers=self.headers)
    
    @task(2)
    def create_daily_report(self):
        self.client.post("/api/v1/daily-reports", json={
            "project_id": "test-project-id",
            "report_date": "2026-08-15",
            "work_summary": "テスト作業内容",
            "worker_count": 5
        }, headers=self.headers)
    
    @task(1)
    def search_knowledge(self):
        self.client.get("/api/v1/knowledge/search?q=安全管理",
                        headers=self.headers)
```

---

## 性能チューニング施策

| 課題 | 施策 | 効果 |
|-----|------|------|
| DBクエリ遅延 | インデックス最適化、N+1問題修正 | レスポンス20〜50%改善 |
| キャッシュ未活用 | Redis キャッシュ導入（一覧API） | レスポンス80%改善 |
| 画像処理遅延 | 非同期処理化（Celery） | レスポンス90%改善 |
| LLM API遅延 | ストリーミングレスポンス対応 | UX体感改善 |
| フロントエンド肥大化 | コード分割・遅延ローディング | 初期ロード50%改善 |

---

## 合否基準

- 全性能目標を達成していること
- エラー率が0.1%以下であること
- 8時間耐久テストでメモリリーク・クラッシュがないこと
- 性能テストレポートが作成・承認されていること
