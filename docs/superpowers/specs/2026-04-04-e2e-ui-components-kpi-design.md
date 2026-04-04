# Sprint 1 Day 3 設計仕様書
## E2E テスト基盤 + 共通UIコンポーネント + KPI API接続

**日付:** 2026-04-04  
**ブランチ:** feat/e2e-playwright-and-ui-components  
**優先度:** 最高（Sprint 1 完成に必須）

---

## 1. 概要

Sprint 1 Day 2 で Backend 3層アーキテクチャ 100% + STABLE N=10 を達成した。
Day 3 では以下の3本柱を ボトムアップ順 で実装する。

| Phase | 内容 | 想定時間 |
|-------|------|---------|
| 1 | 共通UIコンポーネント基盤（`src/components/ui/`） | 2h |
| 2 | KPI API接続 + ダッシュボードリファクタ | 2h |
| 3 | E2E テスト整備（Playwright） | 3h |
| - | Verify / CI / PR | 1h |

---

## 2. 技術的前提

- **Frontend:** React 18 + TypeScript + Vite + TailwindCSS
- **状態管理:** Zustand（認証）+ TanStack React Query（サーバー状態）
- **UIコンポーネント戦略:** `cva` (class-variance-authority) + `clsx` + `tailwind-merge`
- **E2E:** Playwright 1.59 + `page.route()` インターセプト（MSW 不使用）
- **API モック:** Playwright 組み込み route intercept（追加依存ゼロ）

---

## 3. Phase 1: 共通UIコンポーネント

### 3.1 ディレクトリ構造

```
frontend/src/components/
├── Layout.tsx          (既存・変更なし)
└── ui/
    ├── Badge.tsx       (StatusBadge 統合)
    ├── Button.tsx      (btn-primary/secondary 型安全化)
    ├── Card.tsx        (.card クラスのコンポーネント化)
    ├── Skeleton.tsx    (全ページ重複定義を統合)
    ├── StatCard.tsx    (ダッシュボード KPI カード)
    └── index.ts        (barrel export)
```

### 3.2 Badge コンポーネント

**用途:** ステータス・重大度・優先度の表示

```typescript
interface BadgeProps {
  variant: 'default' | 'success' | 'warning' | 'danger' | 'info'
  size?: 'sm' | 'md'
  children: React.ReactNode
  className?: string
}
```

**バリアントマッピング:**
- `success` → green（COMPLETED, RESOLVED, CLOSED）
- `warning` → yellow（IN_PROGRESS, ON_HOLD, PENDING）
- `danger` → red（OPEN, CRITICAL, 重大）
- `info` → blue（PLANNING, NEW）
- `default` → gray（その他）

**既存コードへの影響:** 各ページの `statusColors` / `priorityColors` オブジェクトを削除し、`<Badge variant={...}>` に置き換える。

### 3.3 Button コンポーネント

**用途:** フォーム送信・アクション実行

```typescript
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  leftIcon?: React.ReactNode
}
```

**loading 状態:** スピナー（SVG）を左側に表示し、`disabled` を自動付与。

### 3.4 Card コンポーネント

**用途:** コンテンツのコンテナ

```typescript
interface CardProps {
  padding?: 'none' | 'sm' | 'md' | 'lg'
  className?: string
  children: React.ReactNode
}
```

**padding マッピング:** none=0, sm=p-4, md=p-6（現状と同じ）, lg=p-8

### 3.5 Skeleton コンポーネント

**用途:** ローディング中のプレースホルダー

```typescript
interface SkeletonProps {
  className?: string  // h-*, w-* を外から渡す
}
```

シンプルに `animate-pulse bg-gray-200 rounded` を提供。

### 3.6 StatCard コンポーネント

**用途:** ダッシュボード KPI の数値表示

```typescript
interface StatCardProps {
  icon: React.ReactNode
  title: string
  value: number | string
  trend?: {
    value: number      // 変化率（%）
    direction: 'up' | 'down' | 'neutral'
  }
  colorScheme?: 'blue' | 'green' | 'yellow' | 'red' | 'purple'
}
```

### 3.7 実装方針

- `cva` をインストール: `npm install class-variance-authority`
- 既存の `index.css` の `.btn-primary` / `.btn-secondary` / `.card` / `.badge-*` CSS クラスはそのまま残す（後方互換）
- 各ページのインライン定義は今回のスコープ内のページ（DashboardPage）のみリファクタ。他ページは後続スプリントで対応

---

## 4. Phase 2: KPI API接続 + ダッシュボードリファクタ

### 4.1 新規ファイル: `src/api/dashboard.ts`

```typescript
// レスポンス型（backend/app/schemas/dashboard.py に対応）
interface ProjectStats {
  total: number
  by_status: Record<string, number>  // PLANNING, IN_PROGRESS, ON_HOLD, COMPLETED
}

interface IncidentStats {
  total: number
  by_status: Record<string, number>  // OPEN, IN_PROGRESS, RESOLVED
}

interface CostOverview {
  total_budgeted: number
  total_actual: number
  variance: number
  variance_rate: number
}

interface CountStats {
  daily_reports: number
  photos: number
  users: number
}

export interface DashboardKPI {
  projects: ProjectStats
  incidents: IncidentStats
  costs: CostOverview
  counts: CountStats
}

// API 関数
export async function fetchDashboardKPI(): Promise<DashboardKPI>

// React Query hook
export function useDashboardKPI(): UseQueryResult<DashboardKPI>
```

**Query 設定:**
- `queryKey: ['dashboard', 'kpi']`
- `staleTime: 30_000`（30秒キャッシュ — 他 API と統一）
- `retry: 2`

### 4.2 DashboardPage リファクタ

| 変更前 | 変更後 |
|--------|--------|
| ハードコードの数値 | `useDashboardKPI()` の実データ |
| インライン `Skeleton` 定義 | `<Skeleton>` 共通コンポーネント |
| インライン `StatCard` 定義 | `<StatCard>` 共通コンポーネント |
| ローディング状態なし | `isLoading` → 4枚の Skeleton グリッド |
| エラー状態なし | `isError` → エラーバナー + 再試行ボタン |

**表示する KPI StatCard（4枚）:**
1. プロジェクト数 (`projects.total`) — 青
2. 進行中インシデント (`incidents.by_status.OPEN + IN_PROGRESS`) — 赤
3. コスト達成率 (`1 - costs.variance_rate`) — 緑
4. 本日の日報件数 (`counts.daily_reports`) — 紫

---

## 5. Phase 3: E2E テスト整備

### 5.1 共通フィクスチャ: `e2e/fixtures/api-mocks.ts`

**モックデータ定数（全テストで共有）:**

```typescript
export const MOCK_TOKEN = 'mock-jwt-token-for-testing'

export const MOCK_USER = {
  id: 1, email: 'test@example.com',
  full_name: 'テスト管理者',
  role: 'ADMIN', is_active: true
}

export const MOCK_KPI: DashboardKPI = {
  projects: { total: 10, by_status: { PLANNING: 2, IN_PROGRESS: 5, ON_HOLD: 1, COMPLETED: 2 } },
  incidents: { total: 8, by_status: { OPEN: 3, IN_PROGRESS: 2, RESOLVED: 3 } },
  costs: { total_budgeted: 10_000_000, total_actual: 9_200_000, variance: -800_000, variance_rate: -0.08 },
  counts: { daily_reports: 24, photos: 156, users: 12 }
}

export const MOCK_PROJECTS = [
  { id: 1, name: '渋谷オフィスビル新築工事', status: 'IN_PROGRESS', ... },
  { id: 2, name: '横浜マンション改修工事', status: 'PLANNING', ... },
]
// ... 他ドメインのモックデータも同様
```

**ヘルパー関数:**

```typescript
// 認証済み状態を作る（login + me API をモック）
export async function setupAuthMocks(page: Page): Promise<void>

// 各ドメイン API をモック（一括セットアップ）
export async function setupAllApiMocks(page: Page): Promise<void>

// ログイン → ダッシュボードへ遷移する共通フロー
export async function loginAndNavigate(page: Page): Promise<void>
```

### 5.2 テストファイル別設計

#### `e2e/login.spec.ts`（既存 + 拡張）
- ✅ フォーム表示（既存）
- ✅ 未認証リダイレクト（既存）
- 🆕 ログイン成功 → `/dashboard` 遷移確認
- 🆕 ログアウトボタン → `/login` 遷移確認
- 🆕 無効な認証情報 → エラーメッセージ表示

#### `e2e/navigation.spec.ts`（既存 + 拡張）
- ✅ 未認証リダイレクト（既存）
- 🆕 認証済みサイドバーナビゲーション全リンク
- 🆕 各保護ルートへの直接アクセス（認証済み）

#### `e2e/dashboard.spec.ts`（新規）
- KPI StatCard が4枚表示される
- 各 StatCard に数値が表示される
- `isLoading` 中は Skeleton が表示される（API レスポンス遅延モック）
- `isError` 時はエラーバナーが表示される（API エラーモック）

#### `e2e/projects.spec.ts`（新規）
- プロジェクト一覧が表示される
- ステータスバッジ（IN_PROGRESS → warning）が正しく表示される
- 「新規プロジェクト」ボタンが表示される

#### `e2e/reports.spec.ts`（新規）
- 日報一覧が表示される
- 日付カラムが表示される

#### `e2e/safety.spec.ts`（新規）
- 安全点検一覧が表示される
- 重大度バッジが表示される

#### `e2e/cost.spec.ts`（新規）
- コスト一覧が表示される
- 予算 / 実績 カラムが表示される

### 5.3 CI 統合

`.github/workflows/` に E2E ジョブを追加する。

**前提:** バックエンドが起動していなくても、フロントエンド単体 + API モックで E2E が通ること（`page.route()` によりバックエンド不要）。

```yaml
# 追加ジョブ: e2e-test
- name: Install Playwright browsers
  run: npx playwright install --with-deps chromium
- name: Run E2E tests
  run: npm run e2e
  working-directory: frontend
```

---

## 6. 成功基準

| 項目 | 基準 |
|------|------|
| 共通コンポーネント | 5コンポーネントが型付きで export され、DashboardPage で使用されている |
| KPI API接続 | ダッシュボードが実 API データを表示し、loading/error 状態が動作する |
| E2E テスト | 7ファイル 25件以上のテストが `npm run e2e` で全件通過する |
| CI | GitHub Actions の E2E ジョブが green になる |
| STABLE | test / lint / build / CI すべて success × N=3 |

---

## 7. 制約・注意事項

- `DashboardPage` 以外のページのコンポーネント置き換えは今回スコープ外（後続スプリントで対応）
- 既存の CSS クラス（`.btn-primary` 等）は削除しない（後方互換維持）
- E2E テストはバックエンド起動なしで実行可能とする（CI環境の制約）
- `cva` パッケージのバージョンは `^1.0.0` を使用

---

## 8. ファイル変更一覧

**新規作成:**
- `frontend/src/components/ui/Badge.tsx`
- `frontend/src/components/ui/Button.tsx`
- `frontend/src/components/ui/Card.tsx`
- `frontend/src/components/ui/Skeleton.tsx`
- `frontend/src/components/ui/StatCard.tsx`
- `frontend/src/components/ui/index.ts`
- `frontend/src/api/dashboard.ts`
- `frontend/e2e/fixtures/api-mocks.ts`
- `frontend/e2e/dashboard.spec.ts`
- `frontend/e2e/projects.spec.ts`
- `frontend/e2e/reports.spec.ts`
- `frontend/e2e/safety.spec.ts`
- `frontend/e2e/cost.spec.ts`

**変更:**
- `frontend/src/pages/DashboardPage.tsx`（KPI接続 + コンポーネント置き換え）
- `frontend/e2e/login.spec.ts`（拡張）
- `frontend/e2e/navigation.spec.ts`（拡張）
- `frontend/playwright.config.ts`（必要に応じて調整）
- `.github/workflows/`（E2E ジョブ追加）
- `frontend/package.json`（`cva` 追加）
