# ServiceHub デザインリファレンス

本ディレクトリは ServiceHub Construction Platform の **正式UIデザインリファレンス** を管理します。
フロントエンド実装 (`frontend/`) の見た目・情報設計の基準として参照してください。

## ファイル

- `ServiceHub-WebUI.html` — 正式WebUI ベースライン (v1.0)
  - 単一HTMLファイルで完結 (UMD React + inline JSX + CSS変数)
  - ブラウザで直接開いて動作確認可能 (ビルド不要)
  - 全画面・全コンポーネントの完成形を1ファイルに集約

## 設計システム概要

### カラー
- Brand (ブルー系): `--brand-10` 〜 `--brand-90` (建設の信頼感 + デジタル庁準拠)
- Accent (オレンジ): JIS安全色準拠の警戒色
- Safety / Warn / Err / Ok: セマンティックカラー

### タイポ
- 日本語: Noto Sans JP
- 数値: tabular-nums (モノスペース等幅)

### ナビゲーション構造 (4グループ)
1. **業務** — ダッシュボード / 工事案件 / 日報 / 写真管理
2. **運用** — 安全品質 / 原価管理 / ITSM / ナレッジ
3. **現場・取引** — 工程・スケジュール / 資材・在庫 / 協力会社・職人 / 見積・請求
4. **管理** — ユーザー管理 / 通知設定 / 設定

> **v1.3 (2026-05-09):** 旧 v1.2 の「社内」グループ (Portal/Notices/HR/Rules) は **現場・取引** グループに刷新され、現場業務 4 ページ (schedule/materials/subcontractors/estimates) を持つ構成に変更されています (PR#5bd305e で `frontend/src/components/layout/Layout.tsx` 反映済み)。Phase 5e-1 で導入されていた社内ポータル系ページの実装は `frontend/src/pages/internal/` にコードとして残っていますが、ナビゲーションからは外されています。

## 実装時の対応関係

### 業務グループ
| リファレンス画面 | 実装ファイル |
|---|---|
| DashboardPage (v2: 時刻挨拶 h2 / 原価予実対比 SVG / 現場クイックアクション / 進捗率 — 主要案件 / 最近の工事案件 / 注意インシデント) | `frontend/src/pages/DashboardPage.tsx` |
| ProjectsPage | `frontend/src/pages/projects/ProjectsPage.tsx` |
| ReportsPage | `frontend/src/pages/reports/DailyReportsPage.tsx` |
| PhotosPage | `frontend/src/pages/photos/PhotosPage.tsx` |

### 運用グループ
| リファレンス画面 | 実装ファイル |
|---|---|
| SafetyPage | `frontend/src/pages/safety/SafetyPage.tsx` |
| CostPage | `frontend/src/pages/cost/CostPage.tsx` |
| ITSMPage | `frontend/src/pages/itsm/ItsmPage.tsx` |
| KnowledgePage | `frontend/src/pages/knowledge/KnowledgePage.tsx` |

### 現場・取引グループ (v1.3 新設 — PR#199 + PR#5bd305e)
| リファレンス画面 | 実装ファイル |
|---|---|
| SchedulePage 「工程・スケジュール」 | `frontend/src/pages/schedule/SchedulePage.tsx` |
| MaterialsPage 「資材・在庫」 | `frontend/src/pages/materials/MaterialsPage.tsx` |
| SubcontractorsPage 「協力会社・職人」 | `frontend/src/pages/subcontractors/SubcontractorsPage.tsx` |
| EstimatesPage 「見積・請求」 | `frontend/src/pages/estimates/EstimatesPage.tsx` |

### 管理グループ
| リファレンス画面 | 実装ファイル |
|---|---|
| UsersPage | `frontend/src/pages/users/UsersPage.tsx` |
| NotificationDeliveriesPage 「通知設定」 (PR#894c4ee で「通知配信」→「通知設定」リネーム) | `frontend/src/pages/notifications/NotificationDeliveriesPage.tsx` |
| SettingsPage | `frontend/src/pages/settings/SettingsPage.tsx` |

### 旧 Phase 5e-1 社内グループ (実装は残存 / ナビ非表示)
| リファレンス画面 | 実装ファイル | 状態 |
|---|---|---|
| PortalPage | `frontend/src/pages/internal/PortalPage.tsx` | コード保持 / nav 外 |
| NoticesPage | `frontend/src/pages/internal/NoticesPage.tsx` | コード保持 / nav 外 |
| HRPage | `frontend/src/pages/internal/HRPage.tsx` | コード保持 / nav 外 |
| RulesPage | `frontend/src/pages/internal/RulesPage.tsx` | コード保持 / nav 外 |

## 運用ルール

1. **デザイン変更**: まず `ServiceHub-WebUI.html` を更新し、レビュー完了後に Tailwind + React に移植
2. **バージョン管理**: 大きな改版時は `ServiceHub-WebUI-v2.html` のように派生版を残す
3. **閲覧方法**: ローカルにクローン後、ブラウザで直接ファイルを開くだけで確認可能

## 更新履歴

- v1.0 (2026-04-18): 初版。4グループ構成、社内ポータル新設、ブルー系ブランドカラー統一
- v1.1 (2026-04-18): Phase 5e-1 実装反映。社内グループ 4 ページ (Portal/Notices/HR/Rules) 実装完了、対応表を 12 → 16 行に拡張
- v1.2 (2026-04-24): **v2 デザイン token を frontend に同期**。
  - `frontend/src/index.css`: gray-30/gray-90 追加、`--fs-42` (2.625rem) 追加、radius を md=6/lg=8/xl=12 に調整
  - global `*:focus-visible` / `::placeholder` / `.skip-link` を base レイヤに導入 (WCAG 2.2 SC 2.4.7 / 1.4.3 / 2.4.1)
  - `frontend/index.html`: `<body>` 直下に skip link `<a href="#main-content" class="skip-link">` を配置
  - `frontend/src/components/layout/Layout.tsx`: `<main>` に `id="main-content"` + `tabIndex={-1}` 付与
  - 影響範囲: ページマークアップ変更なし (token 更新 + 2要素追加のみ)
- v1.3 (2026-05-09): **Dashboard v2 + 4 新ページ追加 + 「社内」→「現場・取引」グループ刷新を反映**。
  - PR#199: Dashboard v2 (時刻挨拶 h2 / SVG chart / 現場クイックアクション) + 4 新ページ (Estimates/Materials/Schedule/Subcontractors) 実装
  - PR#203: Dashboard v2 surface (greeting / 原価予実対比 SVG aria-label / 現場クイックアクション h3) E2E カバレッジ
  - PR#207: Dashboard 未カバー h3 セクション 3 件 (進捗率 — 主要案件 / 最近の工事案件 / 注意インシデント) E2E 補完
  - PR#5bd305e: ナビゲーション「社内」→「現場・取引」グループ刷新 (Layout.tsx) — 旧 internal/* ページはコード保持・nav 外
  - PR#894c4ee: 「通知配信」→「通知設定」リネーム (NotificationDeliveriesPage 移行)
  - 対応関係セクションをグループ別に再編成 (16 行フラット → 4 グループ + 旧 Phase 5e-1 アーカイブ表)
