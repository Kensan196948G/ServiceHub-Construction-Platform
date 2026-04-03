# Sprint 2: Frontend 共通化＋エラーハンドリング

## 概要

| 項目 | 内容 |
|------|------|
| 期間 | 2026-04-20 〜 2026-05-03 |
| 工数 | 32時間（4日 × 8h） |
| テーマ | Frontend の再利用性・堅牢性を大幅に向上させる |

## 背景

現在の Frontend は全11ページが動作するが、以下の課題がある:

- 共通UIコンポーネントなし（`components/ui/` が空）
- カスタムフックなし（ロジックがページに直書き）
- 型定義が API ファイルに分散
- ErrorBoundary なし（未処理エラーで白画面）
- Zod / React Hook Form が未活用

## タスク一覧

### Day 1（8h）— 共通コンポーネント抽出

| # | タスク | 工数 | 優先度 |
|---|--------|------|--------|
| 1.1 | Sprint 2 計画確認・GitHub Issues 作成 | 0.5h | 必須 |
| 1.2 | ErrorBoundary コンポーネント実装 | 1.5h | 必須 |
| 1.3 | 共通 Button コンポーネント（variant, size, loading対応） | 1.5h | 必須 |
| 1.4 | 共通 Modal コンポーネント（各ページのモーダルを統一） | 2h | 必須 |
| 1.5 | 共通 DataTable コンポーネント（ソート、ページネーション） | 2.5h | 必須 |

### Day 2（8h）— フォーム・フック共通化

| # | タスク | 工数 | 優先度 |
|---|--------|------|--------|
| 2.1 | 共通 FormField コンポーネント（React Hook Form + Zod統合） | 2h | 必須 |
| 2.2 | Zod バリデーションスキーマ定義（auth, project, report） | 2h | 必須 |
| 2.3 | カスタムフック: useApiQuery（React Query ラッパー） | 1.5h | 必須 |
| 2.4 | カスタムフック: useApiMutation（楽観更新対応） | 1.5h | 必須 |
| 2.5 | カスタムフック: usePagination | 1h | 必須 |

### Day 3（8h）— 型定義整理＋ページ移行

| # | タスク | 工数 | 優先度 |
|---|--------|------|--------|
| 3.1 | `src/types/` に共通型定義ファイルを整備 | 1.5h | 必須 |
| 3.2 | DashboardPage を共通コンポーネントに移行 | 2h | 必須 |
| 3.3 | ProjectsPage を共通コンポーネントに移行 | 2h | 必須 |
| 3.4 | LoginPage に Zod バリデーション適用 | 1h | 必須 |
| 3.5 | 404/500 エラーページ作成 | 1.5h | 推奨 |

### Day 4（8h）— テスト＋残ページ移行

| # | タスク | 工数 | 優先度 |
|---|--------|------|--------|
| 4.1 | 共通コンポーネントのテスト作成 | 2.5h | 必須 |
| 4.2 | 残りページの共通コンポーネント移行（可能な範囲） | 2.5h | 推奨 |
| 4.3 | 全テスト実行・CI確認 | 1.5h | 必須 |
| 4.4 | ドキュメント更新 | 0.5h | 必須 |
| 4.5 | Sprint 2 振り返り・Sprint 3 計画 | 1h | 必須 |

## 成果物

- `frontend/src/components/ui/` — Button, Modal, DataTable, FormField, ErrorBoundary
- `frontend/src/hooks/` — useApiQuery, useApiMutation, usePagination
- `frontend/src/types/` — 共通型定義
- `frontend/src/lib/validations/` — Zod スキーマ
- `frontend/src/pages/errors/` — 404, 500 ページ
- Frontend テストカバレッジ 20%+

## STABLE判定条件

- 全共通コンポーネントのテスト PASS
- ビルド成功（`npm run build`）
- lint エラー 0
- 型チェックエラー 0（`npm run typecheck`）
- 少なくとも3ページが共通コンポーネントに移行済み
