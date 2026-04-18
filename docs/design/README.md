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
1. **業務** — ダッシュボード / 工事案件 / 日報 / 写真・小黒板
2. **運用** — 安全・品質 / 原価管理 / ITSM / ナレッジ
3. **社内** — ポータルTOP / お知らせ・掲示板 / 人事・勤怠 / 規程・手続き
4. **管理** — ユーザー管理 / 通知設定 / 設定

## 実装時の対応関係

| リファレンス画面 | 実装ファイル |
|---|---|
| DashboardPage | `frontend/src/pages/DashboardPage.tsx` |
| ProjectsPage | `frontend/src/pages/projects/ProjectsPage.tsx` |
| ReportsPage | `frontend/src/pages/reports/DailyReportsPage.tsx` |
| PhotosPage | `frontend/src/pages/photos/PhotosPage.tsx` |
| SafetyPage | `frontend/src/pages/safety/SafetyPage.tsx` |
| CostPage | `frontend/src/pages/cost/CostPage.tsx` |
| ITSMPage | `frontend/src/pages/itsm/ItsmPage.tsx` |
| KnowledgePage | `frontend/src/pages/knowledge/KnowledgePage.tsx` |
| PortalPage (Phase 5e-1) | `frontend/src/pages/internal/PortalPage.tsx` |
| NoticesPage (Phase 5e-1) | `frontend/src/pages/internal/NoticesPage.tsx` |
| HRPage (Phase 5e-1) | `frontend/src/pages/internal/HRPage.tsx` |
| RulesPage (Phase 5e-1) | `frontend/src/pages/internal/RulesPage.tsx` |
| UsersPage | `frontend/src/pages/users/UsersPage.tsx` |
| NotifPage | `frontend/src/pages/notifications/NotificationDeliveriesPage.tsx` |
| SettingsPage | `frontend/src/pages/settings/SettingsPage.tsx` |

## 運用ルール

1. **デザイン変更**: まず `ServiceHub-WebUI.html` を更新し、レビュー完了後に Tailwind + React に移植
2. **バージョン管理**: 大きな改版時は `ServiceHub-WebUI-v2.html` のように派生版を残す
3. **閲覧方法**: ローカルにクローン後、ブラウザで直接ファイルを開くだけで確認可能

## 更新履歴

- v1.0 (2026-04-18): 初版。4グループ構成、社内ポータル新設、ブルー系ブランドカラー統一
- v1.1 (2026-04-18): Phase 5e-1 実装反映。社内グループ 4 ページ (Portal/Notices/HR/Rules) 実装完了、対応表を 12 → 16 行に拡張
