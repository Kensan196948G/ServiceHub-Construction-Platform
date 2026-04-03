# Sprint 1: テスト基盤＋Backend Repository層完成

## 概要

| 項目 | 内容 |
|------|------|
| 期間 | 2026-04-03 〜 2026-04-19 |
| 工数 | 32時間（4日 × 8h）※初週は金土日3日間 |
| テーマ | テストの土台を固め、Backend のデータアクセス層を完成させる |

## タスク一覧

### Day 1（8h）— Monitor + Development

| # | タスク | 工数 | 優先度 |
|---|--------|------|--------|
| 1.1 | GitHub Issues/Projects 状態確認・スプリント計画作成 | 1h | 必須 |
| 1.2 | Backend: UserRepository 実装（CRUD + ロール検索） | 2h | 必須 |
| 1.3 | Backend: CostRepository 実装（予実集計メソッド含む） | 2h | 必須 |
| 1.4 | Backend: SafetyRepository / QualityInspectionRepository 実装 | 2h | 必須 |
| 1.5 | Repository 単体テスト作成（User, Cost, Safety） | 1h | 必須 |

### Day 2（8h）— Development + Verify

| # | タスク | 工数 | 優先度 |
|---|--------|------|--------|
| 2.1 | Backend: ItsmRepository（Incident, ChangeRequest）実装 | 2h | 必須 |
| 2.2 | Backend: KnowledgeRepository 実装 | 1.5h | 必須 |
| 2.3 | Backend: WorkHourRepository 実装 | 1h | 必須 |
| 2.4 | 全 Repository の単体テスト作成・実行 | 2h | 必須 |
| 2.5 | 既存エンドポイントを Repository 経由に移行開始 | 1.5h | 必須 |

### Day 3（8h）— Development + Verify

| # | タスク | 工数 | 優先度 |
|---|--------|------|--------|
| 3.1 | Backend: Service層の設計（共通インターフェース定義） | 1h | 必須 |
| 3.2 | Backend: ProjectService 実装（バリデーション・ビジネスルール） | 2h | 必須 |
| 3.3 | Backend: AuthService 実装（トークン生成・検証ロジック分離） | 2h | 必須 |
| 3.4 | Frontend: vitest 設定確認・最初のテスト作成（authStore） | 1.5h | 必須 |
| 3.5 | Frontend: API クライアントのモックテスト基盤構築 | 1.5h | 必須 |

### Day 4（8h）— Verify + Improvement

| # | タスク | 工数 | 優先度 |
|---|--------|------|--------|
| 4.1 | 全テスト実行・カバレッジ確認・CI修正 | 2h | 必須 |
| 4.2 | エンドポイント→Repository移行の残り完了 | 2h | 必須 |
| 4.3 | Service 層テスト作成 | 1.5h | 必須 |
| 4.4 | ドキュメント更新（README、CLAUDE.md） | 1h | 必須 |
| 4.5 | Sprint 1 振り返り・Sprint 2 計画 | 1.5h | 必須 |

## 成果物

- `backend/app/repositories/` — 全モデルの Repository 実装
- `backend/app/services/` — ProjectService, AuthService
- `backend/tests/unit/test_repositories/` — Repository テスト
- `frontend/src/__tests__/` — テスト基盤（authStore テスト）
- Sprint 1 振り返りレポート

## STABLE判定条件

- Backend テスト全件 PASS（カバレッジ 95%+）
- Frontend テスト基盤が動作（最低1テスト PASS）
- CI 全パイプライン成功
- lint エラー 0
