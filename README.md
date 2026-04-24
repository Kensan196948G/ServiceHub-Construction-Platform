# 🏗️ ServiceHub Construction Platform

> 建設業向け統合業務プラットフォーム — FastAPI × React 18 × Docker で構築されたフルスタック SaaS

[![Python](https://img.shields.io/badge/Python-3.12-3776AB?style=flat-square&logo=python&logoColor=white)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?style=flat-square&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?style=flat-square&logo=docker&logoColor=white)](https://docs.docker.com/compose/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-4169E1?style=flat-square&logo=postgresql&logoColor=white)](https://www.postgresql.org/)

[![Backend CI](https://img.shields.io/github/actions/workflow/status/Kensan196948G/ServiceHub-Construction-Platform/backend-ci.yml?branch=main&label=Backend%20CI&style=flat-square&logo=github)](https://github.com/Kensan196948G/ServiceHub-Construction-Platform/actions/workflows/backend-ci.yml)
[![Security Scan](https://img.shields.io/github/actions/workflow/status/Kensan196948G/ServiceHub-Construction-Platform/security.yml?branch=main&label=Security%20Scan&style=flat-square&logo=github)](https://github.com/Kensan196948G/ServiceHub-Construction-Platform/actions/workflows/security.yml)
[![Frontend CI](https://img.shields.io/github/actions/workflow/status/Kensan196948G/ServiceHub-Construction-Platform/frontend-ci.yml?branch=main&label=Frontend%20CI&style=flat-square&logo=github)](https://github.com/Kensan196948G/ServiceHub-Construction-Platform/actions/workflows/frontend-ci.yml)
[![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)](LICENSE)

---

## 📖 概要

**ServiceHub Construction Platform** は、建設業務のデジタル化を目的とした統合業務管理プラットフォームです。  
工事案件の進捗管理から日報・写真・安全品質・原価・ITSM・AI ナレッジまで、現場業務に必要な機能をワンストップで提供します。

### ✨ 特徴

- 🔐 **JWT / RBAC 認証** — ロールベースの細かいアクセス制御
- 🗂️ **工事案件管理** — CRUD・ステータス追跡・予算管理
- 📝 **日報管理** — 作成・提出・承認ワークフロー
- 🖼️ **写真・資料管理** — MinIO (S3) + プリサインド URL による安全な配信
- 🦺 **安全・品質管理** — 安全確認チェック・品質検査記録
- 💰 **原価・工数管理** — コスト記録・予実対比ダッシュボード
- 🏛️ **ITSM 運用管理** — インシデント管理・変更要求ワークフロー
- 🤖 **AI ナレッジ管理** — OpenAI 連携によるナレッジ AI 検索
- 🚀 **ClaudeOS v8 自律開発** — Monitor → Development → Verify → Improvement ループ（CodeRabbit + Codex + Agent Teams）

---

## ⏰ プロジェクト期間・リリース方針

> 本プロジェクトは **6 ヶ月の期間限定開発** であり、**本番リリース期限は絶対厳守** です。

| 🗂️ 項目 | 📌 値 |
|---|---|
| 🗓️ 開発開始日 | **2026-04-03** |
| 🚀 本番リリース期限 | **2026-10-03（半年後・絶対厳守）** |
| ⏳ プロジェクト期間 | **6 ヶ月（26 週）** |
| ⚙️ 実行方式 | **Linux Cron 固定**（月〜土 自動実行） |
| ⏱️ 1 セッション上限 | **5 時間厳守** |
| 🔀 フェーズ配分 | 進捗に応じて CTO 判断で自由変更 OK（リリース期限制約下） |

### 🗓️ 6 ヶ月タイムライン

```mermaid
gantt
    title ServiceHub v1.0 リリースまでの 6 ヶ月
    dateFormat  YYYY-MM-DD
    axisFormat  %m月
    section 基盤
    Month 1-2 基盤・主要機能        :m12, 2026-04-03, 60d
    section 品質
    Month 3-4 テスト・品質向上      :m34, after m12, 60d
    section 統合
    Month 5 統合テスト・バグ修正    :m5,  after m34, 30d
    section 出荷
    Month 6 リリース準備・本番移行  :m6,  after m5,  30d
    section 🎯
    本番リリース                    :milestone, rel, 2026-10-03, 1d
```

### ⚠️ 残日数による自動縮退ルール

> Monitor フェーズで毎回 `state.json.project.release_deadline` を参照して判定します。

| 残日数 | 強制制約 |
|---|---|
| 🟢 残 30 日超 | 通常運用（Monitor → Dev → Verify → Improve） |
| 🟡 残 30 日以内 | Improvement 縮退、Verify / リリース準備を優先 |
| 🟠 残 14 日以内 | **新機能開発禁止**、バグ修正・安定化のみ |
| 🔴 残 7 日以内 | **リリース準備のみ**（CHANGELOG / README / タグ付け / 切り戻し手順） |
| ⛔ 残 0 日超過 | **全作業停止**、CTO エスカレーション（Security blocker 相当） |

機械可読ソース:
- `state.json.project.registered_at` = `2026-04-03`
- `state.json.project.release_deadline` = `2026-10-03`
- `state.json.project.duration_months` = `6`

関連 workflow: [`.github/workflows/release-deadline-check.yml`](.github/workflows/release-deadline-check.yml) が毎日残日数を job summary に出力します。

---

## 🏛️ アーキテクチャ図

```mermaid
graph TB
  NG["🔀 Nginx (Reverse Proxy)"]

  subgraph Frontend["🖥️ Frontend (React 18)"]
    FE["React + Vite + TypeScript\nTailwind CSS / Zustand"]
  end

  subgraph Backend["⚙️ Backend (FastAPI)"]
    API["FastAPI\nPython 3.12\nSQLAlchemy / Alembic"]
  end

  subgraph DB["🗄️ Data Layer"]
    PG["🐘 PostgreSQL 15"]
    RD["⚡ Redis 7"]
    MN["🪣 MinIO (S3 Compatible)"]
  end

  NG --> FE
  NG --> API
  FE --> API
  API --> PG
  API --> RD
  API --> MN
```

---

## ✅ 実装済み機能一覧

| アイコン | モジュール         | 機能                         | API 数 | 状態        |
| :------: | :----------------- | :--------------------------- | :----: | :---------: |
| 🔐       | 認証・認可          | JWT ログイン / トークンリフレッシュ / ロール管理 | 4      | ✅ 完了     |
| 🗂️       | 工事案件管理        | CRUD / ステータス管理 / 予算追跡 | 5      | ✅ 完了     |
| 📝       | 日報管理            | 作成 / 提出 / 承認ワークフロー  | 5      | ✅ 完了     |
| 🖼️       | 写真・資料管理      | MinIO アップロード / プリサインド URL | 5  | ✅ 完了     |
| 🦺       | 安全・品質管理      | 安全確認チェック / 品質検査記録 | 4      | ✅ 完了     |
| 💰       | 原価・工数管理      | コスト記録 / 工数記録 / 予実対比 | 4     | ✅ 完了     |
| 🏛️       | ITSM 運用管理       | インシデント / 変更要求ワークフロー | 5   | ✅ 完了     |
| 🤖       | AI ナレッジ管理     | 記事 CRUD / AI 検索 (OpenAI)  | 5      | ✅ 完了     |
| 📡       | システム            | ヘルスチェック / ステータス確認 | 2     | ✅ 完了     |
| 📊       | Dashboard KPI API   | 集計 KPI 取得 / React Query hook | 1   | ✅ 完了     |
| 🔔       | 通知設定            | 通知購読 preferences 管理 (Phase 1 / UI 統合済) | 2   | ✅ 完了     |
| 📧       | 通知配信基盤        | Email/Slack 送信・リトライ・ADMIN 管理画面 (Phase 2 完了 PR#95〜#107) | 3   | ✅ 完了     |

### 🧩 共通 UI コンポーネント（`src/components/ui/`）

| コンポーネント | 用途 | 特徴 |
| :--- | :--- | :--- |
| 🏷️ `Badge` | ステータス・重要度表示 | 5バリアント（default/success/warning/danger/info）/ cva ベース |
| 🔘 `Button` | 操作ボタン | loading 状態・aria-busy・sr-only 対応 |
| 📦 `Card` | コンテナ | padding バリアント (none/sm/md/lg) / `HTMLAttributes` 継承 |
| 📝 `FormField` | フォームフィールド | label + error + required 表示 / Input・Textarea・Select 付属 |
| 🪟 `Modal` | ダイアログ | HTML `<dialog>` ベース / Escape キー・バックドロップ対応 |
| 📄 `Pagination` | ページネーション | 省略記号・aria-current・前後ナビ |
| ⏳ `Skeleton` | ローディング表示 | `role="status"` / アクセシブル |
| 📈 `StatCard` | KPI カード | 5色スキーム・trend（↑↓→）表示 / Link ラップ対応 |
| 📊 `Table` | データテーブル | ジェネリック型 / カスタムレンダー / クリック対応 |
| 🚨 `ErrorBanner` | APIエラー表示 | `role="alert"` / デフォルトメッセージ / children 対応 |
| 📝 `ErrorText` | フォーム内エラー | インラインテキスト / `role="alert"` |
| 🛡️ `ErrorBoundary` | レンダーエラー捕捉 | React class component / カスタム fallback 対応 / 再試行ボタン |
| 🔔 `NotificationBadge` | 通知ベルアイコン | SSE 接続状態表示 / 未読カウントバッジ / Phase 4a |
| 🗂️ `NotificationPanel` | 通知スライドオーバー | role=dialog / Escape キー / バックドロップ / すべてクリア / Phase 4b |

### 📊 品質メトリクス

| 指標 | 値 |
| :--- | :--- |
| 🧪 Backend テスト | **316 件**（pytest / coverage **95%** / Phase 5c AuthService+TemplateRenderer +23 件 / 2 モジュール 100%） |
| 🔗 統合テスト | **51 件**（integration / Phase 6b #152 — auth / costs / safety / photos / contract / ITSM / knowledge / notifications 全ドメイン） |
| 📜 Contract テスト | **4 件**（schemathesis OpenAPI 整合性 / 全エンドポイントでサーバーエラー 0） |
| 🧪 Frontend テスト | **294 件**（vitest / 44 テストファイル / coverage **88%** / Phase 3c ThemeContext +7 / Phase 5e-3/5e-4/5e-5 実測 +24） |
| 🎭 E2E テスト | **206 件**（Playwright / 28 テストファイル / Phase 4c 通知バッジ・パネル +11 +ダークモード+5 / Phase 5e-1 社内 4 ページ smoke +4） |
| 📊 総テスト数 | **871 件**（Backend + Integration + Contract + Frontend + E2E） |
| 🖥️ フロントエンドページ | **17 ページ**（Phase 5e-1 社内グループ新設: Portal / Notices / HR / Rules +4） |
| 🧩 共通 UI コンポーネント | **14 種**（Badge / Button / Card / ErrorBanner / ErrorBoundary / ErrorText / FormField / Modal / NotificationBadge / NotificationPanel / Pagination / Skeleton / StatCard / Table） |
| 🎨 共通 UI 適用率 | **12/12 既存ページ**（全ページ統一完了 / Phase 5e-1 新設 4 ページは fixture ベースの reference 実装） |
| 🌙 ダークモード | **全ページ対応完了**（ThemeContext / localStorage 永続化 / prefers-color-scheme フォールバック / Phase 3c PR#113 + Phase 3d PR#115 + Phase 5e-1 新設 4 ページ — 全17ページに dark: クラス適用） |
| 🔗 API エンドポイント | **53 エンドポイント**（Phase 3a: `/metrics` Prometheus エンドポイント追加） |
| 🏗️ Repository クラス | **10 クラス**（NotificationDelivery / AuditLog 追加） |
| 🔧 Service クラス | **13 クラス**（NotificationDispatcher + 関連 Sender 追加） |
| 🔀 Router | **11 本**（notifications Router 追加） |
| 📐 OpenAPI codegen | **31 エンドポイント / 68 スキーマ**（TypeScript 型自動生成） |
| 📚 設計ドキュメント | **7 種**（アーキテクチャ / DB / API / UI・UX / セキュリティ / モジュール / 通知機能 Phase2 完了） |
| ✅ CI チェック数 | **16 チェック**（ruff / mypy / pytest / integration / bandit / vitest / build / E2E / dependency / type-check x2 / test-coverage x2 / lint-build x2 + Lighthouse CI） |
| 📊 Prometheus メトリクス | **有効**（`/metrics` エンドポイント / 全ルート RED メトリクス自動計測） |
| ⚡ Web Vitals | **有効**（LCP / INP / CLS / TTFB / FCP / web-vitals v5） |
| 🔒 STABLE 判定 | **達成**（main CI 全 success / Phase 3a PR#110 / 3b PR#111 / 3c PR#113 / 3d PR#115 / Phase 4a PR#119 / 4b PR#121 / 4c PR#123 / Phase 5a PR#129 Docker / Phase 5b PR#139 Lighthouse / Phase 5c PR#130 coverage 95% / Phase 5d PR#148 codegen 同期 / Phase 5e-1 PR#136 社内 4 ページ / 5e-2 PR#138 サイドバー 4 グループ / 5e-3 PR#140 Tailwind tokens / 5e-4 PR#141 Sidebar 配色 / 5e-5 PR#144 WebUI デザインシステム 全 merge 済み — **Phase 5 完全完了** / Phase 6b #152 Integration & Contract Tests 51件 green） |

### 🏗️ Backend アーキテクチャ

```mermaid
graph LR
    R["🔀 Router\n(API Layer)"] --> S["⚙️ Service\n(Business Logic)"]
    S --> Repo["📦 Repository\n(Data Access)"]
    Repo --> DB["🗄️ SQLAlchemy\n(ORM)"]
    DB --> PG["🐘 PostgreSQL"]
```

| Service クラス | 責務 |
| :--- | :--- |
| 🔐 AuthService | 認証・トークン管理・ログイン検証 |
| 🪣 StorageService | MinIO ファイルアップロード・プリサインド URL |
| 💰 CostService | 予実計算・コストサマリー・カテゴリ集計 |
| 🤖 KnowledgeService | AI 検索・スコアリング・OpenAI 連携 |
| 🏛️ ITSMService | インシデントステータス遷移・変更要求承認 |
| 🗂️ ProjectService | 案件コード重複チェック・CRUD |
| 🦺 SafetyService | 安全チェック・品質検査 CRUD |
| 📝 DailyReportService | 日報 CRUD・ワークフロー |
| 👤 UserService | ユーザー管理・重複検出・自己削除防止 |
| 🖼️ PhotoService | 写真アップロード・バリデーション・プリサインドURL |
| 📊 DashboardService | KPI 集約・統計ダッシュボード |
| 🔔 NotificationPreferenceService | 通知購読設定 CRUD (upsert-on-read 方式) |
| 📧 NotificationDispatcher | 通知配信オーケストレータ — 購読判定 → 事前書き込み → EmailSender 呼出 → status 更新 (Phase 2a) |

> **全 10 Router が Router → Service → Repository の3層構造に統一（Service 12クラス / Repository 9クラス）。**

### 🖥️ Frontend アーキテクチャ

```mermaid
graph TD
    subgraph Pages["📄 ページ (17)"]
        LP["🔐 LoginPage"]
        DP["📊 DashboardPage"]
        PP["🗂️ ProjectsPage"]
        PD["📋 ProjectDetail\n(5 tabs)"]
        RP["📝 DailyReportsPage"]
        SP["🦺 SafetyPage"]
        CP["💰 CostPage"]
        IP["🏛️ ItsmPage"]
        KP["🤖 KnowledgePage"]
        PhP["🖼️ PhotosPage"]
        UP["👤 UsersPage"]
        SeP["⚙️ SettingsPage"]
    end

    subgraph UI["🧩 共通 UI (12 種)"]
        Badge["🏷️ Badge"]
        Button["🔘 Button"]
        Card["📦 Card"]
        Modal["🪟 Modal"]
        FormField["📝 FormField\n+ Input/Textarea/Select"]
        ErrorBanner["🚨 ErrorBanner\n+ ErrorText"]
        ErrBnd["🛡️ ErrorBoundary"]
        Skeleton["⏳ Skeleton"]
        StatCard["📈 StatCard"]
        Table["📊 Table"]
        Pagination["📄 Pagination"]
    end

    subgraph State["🗄️ 状態管理"]
        Zustand["Zustand Store"]
        RQ["React Query\n(Server State)"]
    end

    Pages --> UI
    Pages --> State
    State --> API["🔗 Fetch API Client\n(/api/v1)"]
```

---

## 🎭 E2E テスト基盤（Playwright）

```mermaid
graph LR
    subgraph Basic["🎭 基本テスト"]
        L["🔐 login\n6件"]
        N["🧭 navigation\n4件"]
        D["📊 dashboard\n4件"]
    end

    subgraph Pages["📄 ページ表示テスト"]
        P["🗂️ projects\n3件"]
        R["📝 reports\n2件"]
        S["🦺 safety\n2件"]
        C["💰 cost\n2件"]
        I["🏛️ itsm\n3件"]
        K["🤖 knowledge\n2件"]
        U["👤 users\n3件"]
    end

    subgraph CRUD["🔄 CRUD フロー"]
        PC["🗂️ projects-crud\n3件"]
        IC["🏛️ itsm-crud\n5件"]
        CC["💰 cost-crud\n5件"]
        KC["🤖 knowledge-crud\n7件"]
    end

    subgraph Fix["🔧 Fixtures"]
        A["api-mocks.ts"]
    end

    Fix --> Basic & Pages & CRUD
```

| テストファイル | テスト数 | カバー範囲 |
| :--- | :---: | :--- |
| `login.spec.ts` | 6 | 認証成功・失敗・ダッシュボード遷移・フォーム表示 |
| `navigation.spec.ts` | 4 | 認証済みページナビゲーション |
| `dashboard.spec.ts` | 4 | KPI StatCard 表示・エラーバナー・クイックアクション |
| `projects.spec.ts` | 3 | 案件一覧・新規ボタン・ステータスバッジ |
| `reports.spec.ts` | 10 | 日報一覧・フィルタ・ページネーション・空状態 |
| `safety.spec.ts` | 11 | 安全チェック・品質検査タブ・一覧・統計 |
| `cost.spec.ts` | 2 | 原価管理ページ表示 |
| `itsm.spec.ts` | 3 | ITSM 見出し・インシデント管理・変更要求管理 |
| `knowledge.spec.ts` | 2 | ナレッジ見出し・記事一覧 |
| `users.spec.ts` | 12 | ユーザー見出し・一覧・ロール・検索・削除確認 |
| `photos.spec.ts` | 10 | 写真グリッド・カテゴリフィルタ・アップロードUI・空状態 |
| `project-detail.spec.ts` | 13 | 案件詳細・コスト・日報・写真・安全・ITSM各タブ |
| `auth-flow.spec.ts` | 8 | refresh token / logout / セッション永続化 |
| `projects-crud.spec.ts` | 10 | 作成・編集・削除・検索・フィルタ CRUD |
| `reports-crud.spec.ts` | 6 | 日報 作成・編集・削除・キャンセル CRUD |
| `safety-crud.spec.ts` | 8 | 安全チェック・品質検査 作成・削除 CRUD |
| `photos-crud.spec.ts` | 6 | 写真アップロード・削除・キャンセル CRUD |
| `itsm-crud.spec.ts` | 5 | インシデント一覧・バッジ・作成モーダル・編集モーダル・タブ切替 |
| `cost-crud.spec.ts` | 5 | プロジェクト選択・原価一覧・サマリー・作成モーダル・カテゴリバッジ |
| `knowledge-crud.spec.ts` | 7 | 記事一覧・カテゴリバッジ・非公開バッジ・作成・詳細・AI検索・フィルタ |
| `users-crud.spec.ts` | 11 | ユーザー 作成・編集・削除・ロール変更 CRUD |
| `settings.spec.ts` | 8 | 設定ページ プロフィール表示・パスワード変更・エラー |
| `error-boundary.spec.ts` | 5 | ErrorBoundary フォールバックUI・再試行・ナビゲーション |
| `notification-settings.spec.ts` | 6 | 通知設定 UI (マスタースイッチ・イベント別・保存) |
| `notification-panel.spec.ts` | 11 | 通知バッジ表示・パネル開閉・SSE 受信・未読カウント・すべてクリア・アクセシビリティ |
| `phase5e1-internal-pages.spec.ts` | 4 | 社内ポータル / お知らせ / 人事・勤怠 / 社内規程 — 見出し・セクション・フィルタ smoke (Phase 5e-1) |
| **合計** | **206** | **全17ページ E2E + CRUD + 認証フロー + AI検索 + エラー境界 + 通知設定 + 通知パネル(Phase 4c) + 社内グループ(Phase 5e-1)** |

---

## 🗺️ 開発ロードマップ（6ヶ月計画）

```mermaid
gantt
    title ServiceHub Construction Platform — 開発ロードマップ
    dateFormat  YYYY-MM-DD
    section Phase 1: 基盤安定化
    Sprint 1 Day 1 (3層構造)         :done, s1d1, 2026-04-03, 1d
    Sprint 1 Day 2 (CI修復)          :done, s1d2, 2026-04-04, 1d
    Sprint 1 Day 3 (E2E+UI基盤)      :done, s1d3, 2026-04-04, 1d
    section Phase 2: 機能強化
    共通UIコンポーネント統一 11/11     :done, s2a, 2026-04-05, 1d
    E2E CRUD テスト 51件              :done, s2b, 2026-04-05, 1d
    リファクタリング+ErrorBanner      :done, s2c, 2026-04-05, 1d
    DBシード+CORS+Node24              :done, s2d, 2026-04-05, 1d
    テストカバレッジ 88% + API型統一    :done, s2e, 2026-04-07, 1d
    OpenAPI codegen + エラーハンドリング :done, s2f, 2026-04-07, 1d
    axios→fetch + レスポンシブ         :done, s2g, 2026-04-09, 1d
    E2E拡充 (CRUD/users/photos)        :done, s2h, 2026-04-10, 1d
    refresh token + 認証E2E            :done, s2i, 2026-04-10, 1d
    設定ページ + ErrorBoundary          :done, s2j, 2026-04-10, 1d
    通知設定Phase1 preferences API      :done, s2k, 2026-04-10, 1d
    通知設定 UI (frontend 統合)         :done, s2l, 2026-04-10, 1d
    section Phase 3: UX改善
    レスポンシブ・アクセシビリティ    :s3, 2026-04-19, 14d
    section Phase 4: 高度機能
    SSE通知 useSSE hook (PR#119)       :done, s4a, 2026-04-17, 1d
    NotificationBadge/Panel (PR#121)   :done, s4b, 2026-04-17, 1d
    E2E 通知パネルテスト (PR#123)       :done, s4c, 2026-04-18, 1d
    section Phase 5: リリース準備 (Docker/Lighthouse/Coverage/Codegen)
    Phase 5a Docker 本番構成 (PR#129)      :done, s5a, 2026-04-18, 1d
    Phase 5b Lighthouse (PR#139)           :done, s5b, 2026-04-18, 1d
    Phase 5c Coverage 85→95% (PR#130)      :done, s5c, 2026-04-18, 1d
    Phase 5d OpenAPI codegen (PR#148)      :done, s5d, 2026-04-23, 1d
    Phase 5e WebUI 刷新 (PR#136-#144)       :done, s5e, 2026-04-18, 6d
    section Phase 6: 品質強化 + リリース準備
    Phase 6a Backend coverage (#146 closed)     :done, s6a, 2026-04-24, 1d
    Phase 6c E2E Photos/Safety/Cost (#147 #151) :done, s6c, 2026-04-24, 1d
    Phase 6b Integration/Contract tests (#152)  :s6b, after s6c, 30d
    Phase 6d Observability (#153 logging/ready) :s6d, after s6b, 21d
    Phase 6e Security hardening (#154)          :s6e, after s6d, 14d
    section Phase 7: リリース
    統合テスト・本番移行                   :s7, 2026-09-03, 21d
    社内公開                              :milestone, m1, 2026-10-03, 0d
```

| フェーズ | 期間 | 目標 | 状態 |
| :--- | :--- | :--- | :---: |
| 🔵 Phase 1 基盤安定化 | 4月 Week 1 | 3層アーキテクチャ100%・E2E基盤・CI安定 | ✅ 完了 |
| 🟡 Phase 2 機能強化 | 4月〜5月 | UI統一・フォーム改善・E2E拡充・通知機能 Phase2a〜Phase2g 完了 | ✅ 完了 |
| 🟠 Phase 3 UX改善 | 5月〜6月 | レスポンシブ・アクセシビリティ・パフォーマンス・ダークモード | ✅ 完了（3a PR#110 / 3b PR#111 / 3c PR#113 / 3d PR#115） |
| 🔴 Phase 4 高度機能 | 4月 | SSE リアルタイム通知・NotificationBadge・NotificationPanel・E2E 202件 | ✅ 完了（4a PR#119 / 4b PR#121 / 4c PR#123） |
| 🟣 Phase 5 リリース準備 | 4月 PR#129-#149 | Docker 本番構成・Lighthouse・Coverage 85→95%・OpenAPI codegen・WebUI デザインシステム (5a/5b/5c/5d/5e-1〜5e-5) | ✅ 完了 |
| 🟣 Phase 6 品質強化 + リリース準備 | 2026-05〜08 | 6a Backend coverage (#146 ✅) / 6c E2E Photos/Safety/Cost (#147 #151 ✅) / 6b Integration&Contract tests (#152) / 6d Observability (#153) / 6e Security hardening (#154) | 🔄 進行中 |
| 🟢 Phase 7 リリース | 2026-09〜10 | 統合テスト・本番移行・**社内公開** 🎉 | ⏳ 予定 |

---

## 🛠️ 技術スタック

| レイヤ         | 技術                  | バージョン | 用途                         |
| :------------- | :-------------------- | :--------: | :--------------------------- |
| **Frontend**   | React                 | 18         | UI フレームワーク             |
|                | TypeScript            | 5          | 型安全な開発                 |
|                | Vite                  | 5          | 高速ビルドツール             |
|                | Tailwind CSS          | 3          | ユーティリティ CSS           |
|                | Zustand               | 4          | 軽量状態管理                 |
|                | React Query           | 5          | サーバー状態管理             |
|                | Axios                 | 1.x        | HTTP クライアント            |
| **Backend**    | FastAPI               | 0.115      | ASGI Web フレームワーク      |
|                | Python                | 3.12       | バックエンド言語             |
|                | SQLAlchemy            | 2          | ORM                          |
|                | Alembic               | 1.x        | DB マイグレーション          |
|                | Pydantic              | 2          | データバリデーション         |
| **Database**   | PostgreSQL            | 15         | メイン RDBMS                 |
|                | Redis                 | 7          | キャッシュ / セッション       |
|                | MinIO                 | latest     | オブジェクトストレージ (S3)  |
| **Infra**      | Docker Compose        | v2         | コンテナオーケストレーション |
|                | Nginx                 | latest     | リバースプロキシ             |
| **CI/CD**      | GitHub Actions        | —          | 自動テスト / セキュリティスキャン |
| **品質**       | ruff / mypy / pytest  | —          | lint / 型チェック / テスト   |
|                | bandit                | —          | セキュリティ静的解析         |
|                | Playwright            | latest     | E2E テスト（Chromium）       |
|                | cva (class-variance-authority) | ^0.7.1 | UI バリアント管理    |

---

## 🚀 起動手順

```bash
# 1. リポジトリクローン
git clone https://github.com/Kensan196948G/ServiceHub-Construction-Platform.git
cd ServiceHub-Construction-Platform

# 2. 環境変数設定
cp .env.example .env
# .env を編集して DATABASE_URL / SECRET_KEY / MINIO_* / OPENAI_API_KEY 等を設定

# 3. Docker Compose で全サービス起動
docker compose up -d

# 4. DB マイグレーション実行
docker compose exec backend alembic upgrade head

# 5. E2E 動作確認
curl http://localhost/health          # → {"status":"healthy",...}
curl http://localhost/api/v1/status   # → {"status":"ok",...}
# フロントエンド: http://localhost
# API ドキュメント: http://localhost/api/v1/docs
```

> **ローカル開発（フロントエンドのみ）**
> ```bash
> cd frontend && npm install && npm run dev
> # → http://localhost:5173
> ```

---

## 📡 API エンドポイント一覧

ベース URL: `http://localhost/api/v1`

### 🔐 認証 (`/auth`)

| メソッド | パス             | 説明                     |
| :------: | :--------------- | :----------------------- |
| `POST`   | `/auth/login`    | ログイン（JWT 発行）      |
| `POST`   | `/auth/refresh`  | アクセストークンリフレッシュ |
| `GET`    | `/auth/me`       | 認証済みユーザー情報取得  |
| `POST`   | `/auth/logout`   | ログアウト               |

### 🗂️ 工事案件管理 (`/projects`)

| メソッド | パス                    | 説明                   |
| :------: | :---------------------- | :--------------------- |
| `GET`    | `/projects`             | 案件一覧取得（ページング） |
| `POST`   | `/projects`             | 案件新規作成           |
| `GET`    | `/projects/{id}`        | 案件詳細取得           |
| `PUT`    | `/projects/{id}`        | 案件更新               |
| `DELETE` | `/projects/{id}`        | 案件削除               |

### 📝 日報管理

| メソッド | パス                                         | 説明               |
| :------: | :------------------------------------------- | :----------------- |
| `GET`    | `/projects/{project_id}/daily-reports`       | 日報一覧取得       |
| `POST`   | `/projects/{project_id}/daily-reports`       | 日報作成           |
| `GET`    | `/daily-reports/{report_id}`                 | 日報詳細取得       |
| `PUT`    | `/daily-reports/{report_id}`                 | 日報更新           |
| `DELETE` | `/daily-reports/{report_id}`                 | 日報削除           |

### 🖼️ 写真・資料管理

| メソッド | パス                                | 説明                           |
| :------: | :---------------------------------- | :----------------------------- |
| `POST`   | `/projects/{project_id}/photos`     | 写真アップロード (MinIO)        |
| `GET`    | `/projects/{project_id}/photos`     | 写真一覧取得                   |
| `GET`    | `/photos/{photo_id}`                | 写真詳細 + プリサインド URL 取得 |
| `PUT`    | `/photos/{photo_id}`                | 写真メタデータ更新             |
| `DELETE` | `/photos/{photo_id}`                | 写真削除                       |

### 🦺 安全・品質管理

| メソッド | パス                                              | 説明               |
| :------: | :------------------------------------------------ | :----------------- |
| `POST`   | `/projects/{project_id}/safety-checks`            | 安全確認チェック作成 |
| `GET`    | `/projects/{project_id}/safety-checks`            | 安全確認一覧取得   |
| `POST`   | `/projects/{project_id}/quality-inspections`      | 品質検査記録作成   |
| `GET`    | `/projects/{project_id}/quality-inspections`      | 品質検査一覧取得   |

### 💰 原価・工数管理

| メソッド | パス                                        | 説明               |
| :------: | :------------------------------------------ | :----------------- |
| `POST`   | `/projects/{project_id}/cost-records`       | コスト記録作成     |
| `GET`    | `/projects/{project_id}/cost-records`       | コスト記録一覧取得 |
| `GET`    | `/projects/{project_id}/cost-summary`       | 予実対比サマリー取得 |
| `POST`   | `/projects/{project_id}/work-hours`         | 工数記録作成       |

### 🏛️ ITSM 運用管理 (`/itsm`)

| メソッド | パス                               | 説明                 |
| :------: | :--------------------------------- | :------------------- |
| `POST`   | `/itsm/incidents`                  | インシデント作成     |
| `GET`    | `/itsm/incidents`                  | インシデント一覧取得 |
| `GET`    | `/itsm/incidents/{id}`             | インシデント詳細取得 |
| `PATCH`  | `/itsm/incidents/{id}`             | インシデント更新     |
| `POST`   | `/itsm/changes`                    | 変更要求作成         |
| `GET`    | `/itsm/changes`                    | 変更要求一覧取得     |
| `PATCH`  | `/itsm/changes/{id}`               | 変更要求更新         |
| `PATCH`  | `/itsm/changes/{id}/approve`       | 変更要求承認         |

### 🤖 AI ナレッジ管理 (`/knowledge`)

| メソッド | パス                            | 説明                      |
| :------: | :------------------------------ | :------------------------ |
| `POST`   | `/knowledge/articles`           | ナレッジ記事作成          |
| `GET`    | `/knowledge/articles`           | 記事一覧取得（フィルター） |
| `GET`    | `/knowledge/articles/{id}`      | 記事詳細取得              |
| `PATCH`  | `/knowledge/articles/{id}`      | 記事更新                  |
| `DELETE` | `/knowledge/articles/{id}`      | 記事削除                  |
| `POST`   | `/knowledge/search`             | AI 検索 (OpenAI)          |

### 📡 システム

| メソッド | パス              | 説明                    |
| :------: | :---------------- | :---------------------- |
| `GET`    | `/health`         | ヘルスチェック          |
| `GET`    | `/api/v1/status`  | API ステータス確認       |

---

## 🔄 開発フロー（Copilot CLI 自律ループ）

```mermaid
flowchart LR
    M["🔍 Monitor\n状態確認\nIssue/PR/CI 把握"]
    D["🔨 Development\n実装・修復\n設定変更"]
    V["✔️ Verify\ntest/lint/build\nsecurity/CI"]
    I["🔧 Improvement\nリファクタリング\ndocs 整備"]
    C["📦 Close\ncommit/push/PR\n引継ぎ整理"]

    M --> D
    D --> V
    V -->|✅ PASS| I
    V -->|❌ FAIL| D
    I -->|要改善| D
    I --> C
    C -->|次サイクル| M
```

> **ループ判定は時間ではなく「現在の主作業内容」で行います。**  
> 優先順位: `Verify > Development > Monitor > Improvement > Close`

---

## 📁 ディレクトリ構成

```
ServiceHub-Construction-Platform/
├── 📄 AGENT.md                  # 自律開発ポリシー (運用入口)
├── 📄 README.md                 # このファイル
├── 📄 docker-compose.yml        # 本番構成
├── 📄 docker-compose.local.yml  # ローカル開発構成
├── backend/                     # FastAPI バックエンド
│   ├── app/
│   │   ├── api/v1/
│   │   │   ├── auth.py          # 認証ルーター
│   │   │   └── routers/         # 各機能ルーター
│   │   ├── models/              # SQLAlchemy モデル
│   │   └── main.py              # アプリケーションエントリポイント
│   ├── alembic/                 # DB マイグレーション
│   └── tests/                   # pytest テスト
├── frontend/                    # React 18 フロントエンド
│   ├── src/
│   │   ├── components/          # UI コンポーネント
│   │   ├── pages/               # ページコンポーネント
│   │   ├── generated/           # OpenAPI codegen 自動生成型
│   │   ├── store/               # Zustand ストア
│   │   └── api/                 # API クライアント
│   └── vite.config.ts
├── nginx/                       # Nginx 設定
├── docs/                        # 設計・運用ドキュメント
│   └── design/                  # 正式 UI デザインリファレンス (ServiceHub-WebUI.html)
├── .claude/
│   ├── claudeos/                # ClaudeOS v8 自律開発カーネル
│   │   ├── system/              # orchestrator / loop-guard / token-budget
│   │   ├── executive/           # ai-cto / architecture-board
│   │   ├── management/          # scrum-master / dev-factory
│   │   ├── loops/               # monitor / build / verify / improve
│   │   ├── ci/                  # ci-manager / auto-repair
│   │   └── evolution/           # self-evolution
│   └── CLAUDE.md                # ClaudeOS 設定
├── state.json                   # 現在フェーズ・ループ状態管理
└── scripts/                     # 運用スクリプト
```

---

## 📋 ClaudeOS v8 カーネル構成

`.claude/claudeos/` を正規構成として自律開発を行います。

```mermaid
graph TD
    A["📄 CLAUDE.md\n運用入口"] --> B["⚙️ system/orchestrator.md\nループ統制"]
    B --> LG["🛡️ loop-guard.md\n停止条件"]
    B --> TB["💰 token-budget.md\nトークン制御"]
    B --> ML["🔍 monitor-loop.md\n1h: 状態確認"]
    B --> DL["🔨 build-loop.md\n2h: 実装"]
    B --> VL["✔️ verify-loop.md\n2h: テスト"]
    B --> IL["🔧 improve-loop.md\n3h: 改善"]
    A --> CTO["🎯 ai-cto.md\n優先順位判断"]
    A --> AB["🏛️ architecture-board.md\n構造レビュー"]
    A --> SJ["📊 state.json\n状態管理"]
```

### Agent Teams（複雑タスク用）

| Role | 責務 |
| :--- | :--- |
| 🎯 CTO | 優先順位判断・8時間制御・継続可否 |
| 🏛️ Architect | 設計・構造・責務分離 |
| 👷 Developer | 実装・修正・修復 |
| 🔍 Reviewer | 品質・差分・保守性確認 |
| 🧪 QA | テスト・検証・回帰確認 |
| 🔒 Security | 脆弱性・権限・secrets確認 |
| 🚀 DevOps | CI/CD・PR・Deploy制御 |

---

## 🌐 主要 URL（開発環境）

| サービス             | URL                              |
| :------------------- | :------------------------------- |
| 🖥️ フロントエンド     | http://localhost                 |
| ⚙️ バックエンド API   | http://localhost/api/v1          |
| 📖 API ドキュメント   | http://localhost/api/v1/docs     |
| 📡 ヘルスチェック     | http://localhost/health          |
| 🪣 MinIO Console     | http://localhost:9001            |

---

## 🤝 コントリビューション

1. `main` ブランチへの直接 push は禁止
2. フィーチャーブランチを作成して PR を送ってください
3. PR では test / lint / build / security すべてのパスが必要
4. コミットメッセージは `feat:`, `fix:`, `docs:`, `refactor:` 等のプレフィックスを使用
5. Copilot CLI コミットには `Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>` トレーラーを含める

詳細は [`AGENT.md`](AGENT.md) および [`docs/`](docs/) を参照してください。

---

## 📄 ライセンス

This project is licensed under the [MIT License](LICENSE).

---

<div align="center">
  <sub>Built with ❤️ by ClaudeOS v8 · ServiceHub Construction Platform</sub>
</div>
