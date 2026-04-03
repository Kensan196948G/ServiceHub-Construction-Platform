# Sprint 7: 帳票出力 Backend（PDF/Excel 生成）

## 概要

| 項目 | 内容 |
|------|------|
| 期間 | 2026-06-29 〜 2026-07-12 |
| 工数 | 32時間（4日 × 8h） |
| テーマ | PDF/Excel 帳票生成エンジンの構築 |

## 帳票設計

### 出力する帳票（4種）

| # | 帳票名 | 形式 | 内容 |
|---|--------|------|------|
| 1 | 日報レポート | PDF | 1日分の日報（天候、作業者数、作業内容、写真） |
| 2 | 原価レポート | Excel | プロジェクト別の予算 vs 実績、カテゴリ別内訳 |
| 3 | 安全レポート | PDF | 月次安全チェック結果、品質検査サマリー |
| 4 | プロジェクトサマリー | PDF/Excel | プロジェクト全体の進捗・原価・安全の総合レポート |

## タスク一覧

### Day 1（8h）— PDF生成エンジン

| # | タスク | 工数 |
|---|--------|------|
| 1.1 | 帳票生成ライブラリ選定・インストール（WeasyPrint or reportlab） | 1h |
| 1.2 | PDF テンプレートエンジン実装（Jinja2 + HTML/CSS → PDF） | 3h |
| 1.3 | 日本語フォント設定（Noto Sans JP） | 1h |
| 1.4 | 日報レポート PDF テンプレート作成 | 2h |
| 1.5 | 日報 PDF 生成テスト | 1h |

### Day 2（8h）— Excel生成＋残り帳票

| # | タスク | 工数 |
|---|--------|------|
| 2.1 | Excel生成ユーティリティ実装（openpyxl） | 2h |
| 2.2 | 原価レポート Excel テンプレート＋生成ロジック | 2h |
| 2.3 | 安全レポート PDF テンプレート＋生成ロジック | 2h |
| 2.4 | テスト作成（原価Excel、安全PDF） | 2h |

### Day 3（8h）— API＋プロジェクトサマリー

| # | タスク | 工数 |
|---|--------|------|
| 3.1 | プロジェクトサマリー帳票（PDF + Excel 両対応） | 3h |
| 3.2 | `GET /api/v1/reports/daily/{id}/pdf` — 日報PDF API | 1h |
| 3.3 | `GET /api/v1/reports/cost/{project_id}/excel` — 原価Excel API | 1h |
| 3.4 | `GET /api/v1/reports/safety/{project_id}/pdf` — 安全PDF API | 1h |
| 3.5 | `GET /api/v1/reports/project/{id}/summary` — サマリーAPI | 1h |
| 3.6 | StreamingResponse によるファイルダウンロード実装 | 1h |

### Day 4（8h）— テスト＋最適化

| # | タスク | 工数 |
|---|--------|------|
| 4.1 | 帳票API 統合テスト（全4種） | 2.5h |
| 4.2 | 大量データでの帳票生成パフォーマンステスト | 1.5h |
| 4.3 | 帳票テンプレートの見栄え調整 | 2h |
| 4.4 | 全テスト実行・CI確認 | 1h |
| 4.5 | Sprint 7 振り返り | 1h |

## 成果物

- `backend/app/services/report_service.py` — 帳票生成エンジン
- `backend/app/api/v1/endpoints/reports.py` — 帳票API
- `backend/app/templates/reports/` — PDF用HTMLテンプレート
- `backend/tests/unit/test_reports.py` — 帳票テスト

## STABLE判定条件

- 4種帳票が全て生成可能
- PDF に日本語が正しく表示される
- Excel の書式・数式が正しい
- 全テスト PASS、CI成功
