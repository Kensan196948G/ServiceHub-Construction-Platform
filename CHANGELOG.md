# CHANGELOG

All notable changes to this project will be documented in this file.
Format based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [1.1.0] - 2026-04-25

### Added

#### Phase 10a: CHANGELOG 整備 + バージョン履歴文書化（Issue #171）
- **[Unreleased] セクション** — Keep a Changelog 形式に準拠した未リリース変更の集約
- **バージョン履歴の時系列整理** — v0.x.x 開発フェーズ (v0.8.0 / v0.8.1 / v0.9.0) と v1.0.0 系列の並存構造を明文化

#### Phase 10b: API・ユーザードキュメント整備（PR #174 / Issue #172）
- **`docs/user-guide/getting-started.md`** — 5 ステップ初回セットアップガイド（Docker Compose ベース）
- **`docs/user-guide/construction-projects.md`** — 工事案件 CRUD・ステータス遷移・日報・原価・安全確認の操作ガイド
- **`docs/user-guide/admin-guide.md`** — 管理者向け: ロール設計・ユーザー管理・秘密情報ローテーション・ITSM 運用手順
- **FastAPI OpenAPI description 拡充** — `app.description` に認証フロー・ロール表・エラー形式・レート制限を Markdown で追加
- **エンドポイント docstring 詳細化** — auth / projects / costs / safety の主要エンドポイントに権限・パラメータ・制限事項を記載
- **README ユーザードキュメントセクション追加** — `📚 ユーザードキュメント` テーブルを README に挿入

#### Phase 10c: 最終セキュリティ監査 + v1.1.0 リリース（Issue #173）
- **Trivy CRITICAL/HIGH=0 最終確認** — backend / frontend コンテナイメージの脆弱性ゼロを CI で確認
- **OWASP Top 10 セルフチェック** — bandit / CodeQL / Dependency Review 全 pass
- **CHANGELOG [Unreleased] → [1.1.0] 昇格** — Phase 10a/10b/10c の変更をバージョンタグへ昇格
- **GitHub Release v1.1.0** — 全 Phase 10 成果物を含む最終リリース

### Metrics
| 指標 | v0.9.0 | v1.1.0 |
|---|---|---|
| バックエンドテスト | 365 件 | 365 件 |
| E2E テスト | 206 件 | 206 件 |
| CI チェック数 | 20 | **20** |
| 脆弱性 (CRITICAL/HIGH) | 0 | **0 維持** |
| ユーザードキュメント | なし | **3 ガイド** |
| OpenAPI description | 最小限 | **完全拡充** |

---

## [0.9.0] - 2026-04-25

### Added

#### Phase 9a: Prometheus + Grafana 監視スタック（PR #168）
- **prometheus-fastapi-instrumentator** — FastAPI `/metrics` エンドポイント自動計測（全ルート RED メトリクス）
- **docker-compose.monitoring.yml** — prometheus / grafana / alertmanager / node-exporter / postgres-exporter / redis-exporter 分離構成
- **Prometheus 設定** — `monitoring/prometheus/prometheus.yml` + アラートルール 4 件
- **Grafana ダッシュボード** — `monitoring/grafana/dashboards/servicehub.json` (JSON provisioning)
- **`make monitoring-up`** コマンド追加（Grafana:3001 / Prometheus:9090 / Alertmanager:9093）

#### Phase 9b: k6 SLO 負荷試験拡充（PR #169）
- **SLO 定義** (`docs/design/slo.md`) — P95 < 1s @ 100VU / エラー率 < 2% / 可用性 99.9%
- **k6_slo_test.js** — smoke + 100VU SLO load シナリオ（P95/P99 閾値チェック）
- **k6_spike_test.js** — 0→200VU スパイクシナリオ
- **k6_endpoints_test.js** — 7 エンドポイントグループ（auth / projects / reports / safety / cost / photos / itsm）
- **GitHub Actions 週次実行** — `performance-test.yml` k6-slo job（毎週月曜 09:00 JST）

#### Phase 9c: Kubernetes Helm chart 骨格（PR #170）
- **Helm v3 chart** (`charts/servicehub/`) — bitnami/postgresql 15.5.x + bitnami/redis 19.x 依存
- **Deployment×2** — backend (FastAPI) / frontend (Next.js)、セキュリティコンテキスト完備
  - `readOnlyRootFilesystem: true` / `runAsNonRoot: true` / `capabilities.drop: [ALL]`
- **HPA v2** — backend 2-10pod / frontend 2-6pod（CPU 70% / scaleDown 300s stabilization）
- **Ingress (nginx)** — path-based routing `/api` → backend / `/` → frontend
- **RBAC** — Role + RoleBinding + ServiceAccount（最小権限: configmaps/secrets/pods のみ）
- **Namespace + ConfigMap + Secret** (`helm.sh/resource-policy: keep`)
- **Helm Lint CI** (`.github/workflows/helm-lint.yml`) — `helm lint --strict` + kubeconform 1.29.0
- **Kubernetes デプロイメントガイド** (`docs/deployment/kubernetes.md`)

### Metrics
| 指標 | v0.8.1 | v0.9.0 |
|---|---|---|
| バックエンドテスト | 365 件 | 365 件 |
| E2E テスト | 206 件 | 206 件 |
| CI チェック数 | 19 | **20** (Helm Lint 追加) |
| 脆弱性 (CRITICAL/HIGH) | 0 | **0 維持** |
| SLO P95 目標 | 未定義 | **< 1s @ 100VU** |
| Kubernetes 対応 | なし | **Helm chart 骨格** |

---

## [0.8.1] - 2026-04-25

### Added
- **Trivy コンテナスキャン** — CI Security Scan ワークフローに Trivy (aquasecurity/trivy-action@v0.36.0) 追加。backend (development target) + frontend (production target) の両イメージを CRITICAL/HIGH 脆弱性ゼロ目標でスキャン

### Fixed
- **本番環境 Docker Compose** (`docker-compose.prod.yml`) — alembic マイグレーション実行コマンド追加・healthcheck 設定・欠落環境変数 (`JWT_ALGORITHM`, `MINIO_BUCKET`, `LOG_LEVEL`, `ALLOWED_ORIGINS` 等) を追加
- **pytest-benchmark ScopeMismatch** — `bench_client` fixture を `function` スコープに変更 (pytest-asyncio 0.24 対応)
- **ruff E501** — `config.py` 日本語コメント 90文字超を英語短縮コメントに修正

### Security
- **CVE-2024-33663** (CRITICAL) — `python-jose` 3.3.0 → 3.5.0 (algorithm confusion with OpenSSH ECDSA keys)
- **CVE-2024-53981** (HIGH) — `python-multipart` 0.0.12 → 0.0.26 (DoS via deformation)
- **CVE-2026-24486** (HIGH) — `python-multipart` 0.0.12 → 0.0.26 (Arbitrary file write via multipart)
- **CVE-2024-47874** (HIGH) — `starlette` 0.38.6 → 0.46.2 (`fastapi` 0.115.0 → 0.115.14 更新で間接修正, DoS)
- **CVE-2025-62727** (HIGH) — `starlette` 0.46.2 → 0.49.1 + `fastapi` 0.115.14 → 0.124.4 (DoS via Range header merging)
- **Frontend OS CVE 22件** (CRITICAL: 3 / HIGH: 19) — nginx ベースイメージ `1.25-alpine` → `1.27-alpine` + `apk upgrade` で Alpine OS パッケージ全更新 (curl/libexpat/libxml2/musl 等)

### Metrics
| 指標 | v0.8.0 | v0.8.1 |
|---|---|---|
| CI チェック数 | 18 | **19** (Trivy 追加) |
| 脆弱性 (CRITICAL/HIGH) | 未スキャン | **0** 目標 |

---

## [0.8.0] - 2026-04-25

### Added

#### Phase 7: 統合テスト・デプロイパイプライン
- **E2E フルスタック統合テスト** — Docker Compose + Playwright 15シナリオ（`docker-compose.test.yml` + `playwright.fullstack.config.ts`）
- **k6 負荷テスト** — `/api/v1/projects` への定常 RPS 計測 CI ワークフロー追加（`k6/load_test.js`）
- **pytest-benchmark** — API レスポンスタイム回帰検知 CI ワークフロー追加
- **デプロイパイプライン** — GHCR Docker push + staging smoke test + rollback 手順（`.github/workflows/deploy.yml`）

#### Phase 6: 品質強化・セキュリティ
- **slowapi レート制限** — ログイン 5 回/分・リフレッシュ 10 回/分（環境変数で設定可能）
- **JWT 監査ログ** — 全 API 操作に `user_id` 埋め込み
- **CodeQL セキュリティ分析** — GitHub Actions ワークフロー追加
- **/health/live + /health/ready** — Liveness / Readiness プローブ分離
- **X-Request-ID correlation** — 全リクエストにトレーシング ID を自動付与
- **統合テスト 51 件追加** — auth / cost / photos / safety + schemathesis contract テスト
- **E2E テスト拡充** — cost / photos / safety スペックを合計 206 件に拡張

### Fixed
- **E2E CI 全テスト通過** — `/health/live` レスポンス `"alive"` への regex 対応・CRUD テストに `project_code` 必須入力を追加
- **レート制限 E2E 競合解消** — テスト環境で `LOGIN_RATE_LIMIT=1000/minute` に緩和（`docker-compose.test.yml`）

### Security
- slowapi による Brute-force 対策（ログインエンドポイント）
- bandit 週次スキャン ワークフロー維持
- secret rotation 手順書追加（`docs/security/secret-rotation.md`）

### Metrics
| 指標 | v0.7.x | v0.8.0 |
|---|---|---|
| バックエンドテスト | 314 件 | 365 件 (+51) |
| フロントエンドテスト | 270 件 | 294 件 (+24) |
| E2E テスト | 147 件 | 221 件 (+74) |
| バックエンドカバレッジ | 85% | 95% |
| フロントエンドカバレッジ | 75% | 88% |
| CI チェック数 | 8 | 18 |

---

## [1.0.0] - 2026-04-03

### Added

#### フロントエンド実装完了（PR #28, #29）
- **React 18 / Vite / TypeScript / Tailwind CSS** フロントエンド基盤構築
- **認証**: LoginPage / Zustand authStore（JWT永続化）/ axios interceptor
- **レイアウト**: レスポンシブサイドバー / ダッシュボード
- **工事案件管理** — ProjectsPage（一覧・ページネーション・ステータスバッジ）/ ProjectDetailPage
- **日報管理** — DailyReportsPage（プロジェクト別一覧・新規作成モーダル・ステータス管理）
- **安全・品質管理** — SafetyPage（安全チェック / 品質検査タブ切替）
- **ITSM管理** — ItsmPage（インシデント / 変更要求タブ・優先度カラーバッジ）
- **ナレッジ管理** — KnowledgePage（記事一覧・AI検索・カテゴリフィルター）
- **原価管理** — CostPage（予算/実績/差異サマリーカード・原価記録テーブル）
- **API クライアント** — daily_reports / safety / itsm / knowledge / cost（TypeScript型付き）

#### CI/CD 修復（PR #27）
- ruff 0.6.9 固定・pytest asyncio_mode=auto・mypy strict 全通過
- 統合テスト 30/30 グリーン

### Fixed
- conftest.py ruff format 修正
- TypeScript 型エラー全件修正（重複コンテンツ除去・API 関数名統一）

### E2E Status
- docker-compose 統合確認: E2E 全10チェック PASS ✅
- API: 35エンドポイント / DB: 13テーブル / 7マイグレーション

### CI Status
- Backend: ruff/mypy/pytest-30件/bandit 全グリーン ✅
- Frontend: TypeScript 0エラー / Vite build 成功 ✅

### E2E Verification
- docker-compose 統合確認: 全10チェック PASS ✅
- 起動サービス: api / db / redis / frontend / nginx / minio
- テスト環境: docker-compose.local.yml（ポート競合回避）

---

## [1.0.0] - 2026-10-02 (社内リリース予定)

### Added

#### Phase1: 基盤構築
- Docker Compose開発環境（FastAPI / PostgreSQL15 / Redis7 / MinIO / Nginx）
- JWT認証（HS256 / アクセス15分 / リフレッシュ7日）
- RBAC認可（ADMIN / PROJECT_MANAGER / SITE_SUPERVISOR / COST_MANAGER / IT_OPERATOR / VIEWER）
- SoD（職務分離）実装
- SQLAlchemy 2.0 async / Alembic マイグレーション
- GitHub Actions CI/CD（lint / test / security scan）

#### Phase2: コアモジュール
- **工事案件管理** — 案件CRUD / ステータス管理 / 予算管理
- **日報管理** — 日報作成・提出・承認ワークフロー
- **写真・資料管理** — MinIOストレージ / プリサインドURL
- **安全・品質管理** — 安全確認チェックリスト / 品質検査記録
- **原価・工数管理** — コスト記録 / 予実対比サマリーAPI

#### Phase3-4: 拡張モジュール
- **ITSM運用管理**（ISO20000準拠）
  - インシデント管理（INC番号採番 / 優先度 / 解決管理）
  - 変更要求管理（CHG番号採番 / 変更承認ワークフロー / SoD）
- **ナレッジ管理・AI支援**
  - ナレッジ記事CRUD（カテゴリ / タグ / 公開管理）
  - AI検索API（OpenAI gpt-4o-mini / フォールバックキーワード検索）
  - AI検索ログ（監査・改善用）

#### Phase5: テスト基盤
- pytest統合テスト（SQLite aiosqliteインメモリDB）
- SoD検証テスト（変更承認: ADMINのみ）
- Locust性能テスト
- テスト計画書

#### Phase6: リリース準備
- 本番用docker-compose.prod.yml（マルチレプリカ対応）
- .env.prod.example（全環境変数テンプレート）
- デプロイメントガイド

### API仕様

| エンドポイント | 説明 |
|---|---|
| `POST /api/v1/auth/login` | ログイン |
| `GET /api/v1/projects/` | 工事案件一覧 |
| `GET /api/v1/daily-reports/` | 日報一覧 |
| `POST /api/v1/photos/upload` | 写真アップロード |
| `GET /api/v1/safety/checks` | 安全確認一覧 |
| `GET /api/v1/costs/summary/{project_id}` | 原価サマリー |
| `POST /api/v1/itsm/incidents` | インシデント起票 |
| `POST /api/v1/itsm/changes` | 変更要求起票 |
| `POST /api/v1/knowledge/search` | AI検索 |

### 技術スタック

- **Backend**: Python 3.12 / FastAPI / SQLAlchemy 2.0 async
- **DB**: PostgreSQL 15 / Redis 7 / MinIO
- **Frontend**: React 18 / Vite / TypeScript（フロントエンド実装は次フェーズ）
- **Infra**: Docker Compose / Nginx / GitHub Actions

### セキュリティ

- NIST CSF / ISO27001 / ISO20000 準拠
- 監査ログ（全操作のcreated_by/updated_by記録）
- 論理削除（deleted_at）
- X-Request-ID トレーシング
- bandit週次セキュリティスキャン
