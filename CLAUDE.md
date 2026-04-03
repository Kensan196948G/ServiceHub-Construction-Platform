# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## プロジェクト概要

建設業向け統合業務プラットフォーム（SaaS）。FastAPI + React 18 + Docker Compose のフルスタック構成。
日本語ファーストのプロジェクト — コメント・ドキュメント・コミットメッセージは日本語。

## コマンド一覧

### Docker（全サービス起動）

```bash
make up              # 全サービス起動（API:8000, Frontend:3000, MinIO:9001）
make up-build        # ビルド＋起動
make down            # 停止
make down-v          # 停止＋ボリューム削除
make logs            # 全ログ表示
make logs-api        # APIログのみ
```

### バックエンド（backend/）

```bash
make test            # 全テスト実行（カバレッジ付き）
make test-unit       # ユニットテストのみ
make test-integration # 統合テストのみ
make lint            # ruff チェック＋フォーマットチェック
make format          # ruff 自動フォーマット
make typecheck       # mypy 型チェック
make migrate         # Alembic マイグレーション実行
make migrate-down    # 1つロールバック
make seed            # 開発データ投入
make shell-api       # APIコンテナのシェルに入る
```

単一テスト実行:
```bash
cd backend && python -m pytest tests/unit/test_xxx.py::test_func -v
```

### フロントエンド（frontend/）

```bash
cd frontend
npm run dev          # Vite 開発サーバー（ポート3000）
npm run build        # tsc + vite ビルド
npm run test         # vitest 実行
npm run test:coverage # カバレッジ付きテスト
npm run lint         # ESLint
npm run lint:fix     # ESLint 自動修正
npm run typecheck    # TypeScript 型チェック
```

## アーキテクチャ

### バックエンド（レイヤー構成）

```
backend/app/
├── api/v1/endpoints/   # FastAPI ルーター（/api/v1 プレフィックス）
├── models/             # SQLAlchemy ORM モデル（mapped_column, Mapped型）
├── schemas/            # Pydantic v2 リクエスト/レスポンススキーマ
├── services/           # ビジネスロジック層
├── repositories/       # データアクセス層
├── core/               # 設定（Pydantic Settings）、セキュリティ、依存性注入
└── middleware/          # CORS、リクエストロギング、例外ハンドラー
```

リクエストフロー: `Router → Schema validation → Service → Repository → Model → DB`

### フロントエンド（構成）

```
frontend/src/
├── api/               # Axios クライアント（JWT 自動注入、401 ハンドリング）
├── components/        # 共通UIコンポーネント
├── pages/             # ページコンポーネント（React Router v6）
├── stores/            # Zustand ストア（persist middleware）
├── hooks/             # カスタムフック
└── types/             # TypeScript 型定義
```

パスエイリアス: `@/*` → `./src/*`

### データ層

- **PostgreSQL 15**: asyncpg 経由の非同期接続（本番）/ aiosqlite インメモリ（テスト）
- **Redis 7**: キャッシュ・セッション
- **MinIO**: S3 互換オブジェクトストレージ（写真・資料）
- **Alembic**: DBマイグレーション管理

## 認証・認可

- JWT トークン（RS256 または HS256）
- RBAC ロール: `ADMIN`, `MANAGER`, `PROJECT_MANAGER`, `VIEWER`, `IT_ADMIN`
- ソフトデリート: `deleted_at` カラムによる論理削除
- 監査カラム: `created_at`, `updated_at` 全モデルに共通

## テスト構成

- **バックエンド**: pytest + pytest-asyncio（auto モード）、aiosqlite インメモリDB
  - `tests/unit/` — ユニットテスト
  - `tests/integration/` — 統合テスト
  - `tests/performance/` — パフォーマンステスト（Locust）
  - 固定UUIDのテストユーザー（ADMIN, VIEWER, PM, IT）が conftest.py で定義済み
  - CI タイムアウト: 60秒
- **フロントエンド**: vitest + @testing-library/react

## CI/CD（GitHub Actions）

- **backend-ci**: ruff lint → pytest（カバレッジ→codecov）→ mypy
- **frontend-ci**: ESLint → Vite ビルド（dist を7日間保持）
- **security-scan**: セキュリティスキャン
- トリガー: main/feature/* への push、main への PR

## コーディング規約

### Python
- ruff（88文字行長）でリント＋フォーマット
- mypy strict モードで型チェック
- Pydantic v2 の `Field` バリデーター使用
- structlog による構造化ログ（JSON形式）
- 統一エラーレスポンス形式: `{success, data, error}`

### TypeScript
- strict モード有効
- Zustand + React Query でサーバー状態管理
- React Hook Form + Zod でフォームバリデーション
- Tailwind CSS（clsx + tailwind-merge でクラス結合）
- Lucide React アイコン、Recharts チャート

## Git ワークフロー

- `main` への直接 push 禁止 — feature ブランチ経由
- 1 feature = 1 commit を原則
- STABLE 判定（test/CI/lint/build 全成功、エラー0、セキュリティ問題0）後にマージ

## 開発フェーズ（第2期: v1.0 社内リリース）

- 期間: 2026-04-03 〜 2026-10-03（6ヶ月）
- 開発頻度: 土日 × 8時間 = 週16時間（総416時間）
- 詳細計画: `docs/development-phases/00_全体計画.md`

| Phase | 期間 | テーマ |
|-------|------|--------|
| 1 | 4/5-5/17 | 基盤安定化（テスト、共通化、セキュリティ） |
| 2 | 5/18-6/28 | ダッシュボード強化＋ワークフロー承認 |
| 3 | 6/29-8/9 | 帳票出力（PDF/Excel）＋監視基盤（Prometheus/Grafana） |
| 4 | 8/10-9/6 | 統合テスト＋品質保証 |
| 5 | 9/7-10/3 | デプロイ準備＋社内リリース |

## ClaudeOS ループ運用

各8時間セッション:
- 🔍 Monitor（1h）→ 🔨 Development（2h）→ ✔ Verify（2h）→ 🔧 Improvement（3h）
- 各ループ間 5〜15分クールダウン許可
- STABLE判定: 小規模N=2、通常N=3、重要N=5
