# CHANGELOG

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
