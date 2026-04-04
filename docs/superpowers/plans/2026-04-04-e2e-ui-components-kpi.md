# E2E テスト基盤 + 共通UIコンポーネント + KPI API接続 実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 共通UIコンポーネント（cva ベース）を作成し、ダッシュボードを KPI API に接続し、Playwright E2E テストで主要ページを網羅する。

**Architecture:** Phase 1 で `src/components/ui/` に5コンポーネントを作成、Phase 2 で `DashboardPage` を KPI API に繋ぎ共通コンポーネントを使用するようリファクタ、Phase 3 で `e2e/` に7テストファイルを追加して CI に統合する。

**Tech Stack:** React 18 + TypeScript + Vite + TailwindCSS + `class-variance-authority` + TanStack React Query + Playwright 1.59 + Vitest + React Testing Library

---

## ファイル変更マップ

| 操作 | パス | 責務 |
|------|------|------|
| 新規 | `frontend/src/lib/cn.ts` | `clsx` + `tailwind-merge` 合成ユーティリティ |
| 新規 | `frontend/src/components/ui/Badge.tsx` | ステータスバッジ（cva バリアント） |
| 新規 | `frontend/src/components/ui/Badge.test.tsx` | Badge ユニットテスト |
| 新規 | `frontend/src/components/ui/Button.tsx` | ボタン（loading 対応） |
| 新規 | `frontend/src/components/ui/Button.test.tsx` | Button ユニットテスト |
| 新規 | `frontend/src/components/ui/Card.tsx` | カードコンテナ |
| 新規 | `frontend/src/components/ui/Card.test.tsx` | Card ユニットテスト |
| 新規 | `frontend/src/components/ui/Skeleton.tsx` | ローディングプレースホルダー |
| 新規 | `frontend/src/components/ui/StatCard.tsx` | KPI 統計カード |
| 新規 | `frontend/src/components/ui/StatCard.test.tsx` | StatCard ユニットテスト |
| 新規 | `frontend/src/components/ui/index.ts` | barrel export |
| 新規 | `frontend/src/api/dashboard.ts` | KPI API クライアント + React Query hook |
| 変更 | `frontend/src/pages/DashboardPage.tsx` | KPI API接続 + 共通コンポーネント置き換え |
| 新規 | `frontend/e2e/fixtures/api-mocks.ts` | 共通 route intercept ヘルパー |
| 変更 | `frontend/e2e/login.spec.ts` | ログイン成功・ログアウトテスト追加 |
| 変更 | `frontend/e2e/navigation.spec.ts` | 認証済みナビゲーションテスト追加 |
| 新規 | `frontend/e2e/dashboard.spec.ts` | KPI表示・loading・error テスト |
| 新規 | `frontend/e2e/projects.spec.ts` | プロジェクト一覧テスト |
| 新規 | `frontend/e2e/reports.spec.ts` | 日報ページテスト |
| 新規 | `frontend/e2e/safety.spec.ts` | 安全点検ページテスト |
| 新規 | `frontend/e2e/cost.spec.ts` | コストページテスト |
| 変更 | `.github/workflows/ci-frontend.yml` | E2E ジョブ追加 |
| 変更 | `frontend/package.json` | `class-variance-authority` 追加 |

---

## Phase 1: 共通UIコンポーネント

### Task 1: cva インストール + cn ユーティリティ作成

**Files:**
- Modify: `frontend/package.json`
- Create: `frontend/src/lib/cn.ts`

- [ ] **Step 1: cva をインストール**

```bash
cd frontend && npm install class-variance-authority
```

Expected: `package.json` の dependencies に `"class-variance-authority": "^1.0.0"` が追加される。

- [ ] **Step 2: cn ユーティリティを作成**

`frontend/src/lib/cn.ts` を作成:

```typescript
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

- [ ] **Step 3: TypeScript 型チェック**

```bash
cd frontend && npx tsc --noEmit 2>&1 | head -20
```

Expected: エラーなし。

- [ ] **Step 4: コミット**

```bash
cd frontend && cd .. && git add frontend/package.json frontend/package-lock.json frontend/src/lib/cn.ts
git commit -m "feat(ui): install cva and add cn utility"
```

---

### Task 2: Badge コンポーネント（TDD）

**Files:**
- Create: `frontend/src/components/ui/Badge.tsx`
- Create: `frontend/src/components/ui/Badge.test.tsx`

- [ ] **Step 1: テストを先に書く**

`frontend/src/components/ui/Badge.test.tsx` を作成:

```typescript
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { Badge } from "./Badge";

describe("Badge", () => {
  it("renders children", () => {
    render(<Badge variant="default">テスト</Badge>);
    expect(screen.getByText("テスト")).toBeInTheDocument();
  });

  it("applies success variant classes", () => {
    const { container } = render(<Badge variant="success">完了</Badge>);
    expect(container.firstChild).toHaveClass("bg-green-100");
    expect(container.firstChild).toHaveClass("text-green-800");
  });

  it("applies warning variant classes", () => {
    const { container } = render(<Badge variant="warning">保留</Badge>);
    expect(container.firstChild).toHaveClass("bg-yellow-100");
    expect(container.firstChild).toHaveClass("text-yellow-800");
  });

  it("applies danger variant classes", () => {
    const { container } = render(<Badge variant="danger">未対応</Badge>);
    expect(container.firstChild).toHaveClass("bg-red-100");
    expect(container.firstChild).toHaveClass("text-red-800");
  });

  it("applies info variant classes", () => {
    const { container } = render(<Badge variant="info">計画中</Badge>);
    expect(container.firstChild).toHaveClass("bg-blue-100");
    expect(container.firstChild).toHaveClass("text-blue-800");
  });

  it("applies sm size classes", () => {
    const { container } = render(<Badge variant="default" size="sm">小</Badge>);
    expect(container.firstChild).toHaveClass("text-xs");
  });

  it("accepts additional className", () => {
    const { container } = render(
      <Badge variant="default" className="extra-class">テスト</Badge>
    );
    expect(container.firstChild).toHaveClass("extra-class");
  });
});
```

- [ ] **Step 2: テストが失敗することを確認**

```bash
cd frontend && npx vitest run src/components/ui/Badge.test.tsx 2>&1 | tail -10
```

Expected: `Cannot find module './Badge'` エラー。

- [ ] **Step 3: Badge コンポーネントを実装**

`frontend/src/components/ui/Badge.tsx` を作成:

```typescript
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 font-medium",
  {
    variants: {
      variant: {
        default: "bg-gray-100 text-gray-700",
        success: "bg-green-100 text-green-800",
        warning: "bg-yellow-100 text-yellow-800",
        danger: "bg-red-100 text-red-800",
        info: "bg-blue-100 text-blue-800",
      },
      size: {
        sm: "text-xs px-2 py-0.5",
        md: "text-sm px-2.5 py-0.5",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, size, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant, size }), className)} {...props} />
  );
}
```

- [ ] **Step 4: テストが通ることを確認**

```bash
cd frontend && npx vitest run src/components/ui/Badge.test.tsx 2>&1 | tail -10
```

Expected: `7 passed`.

- [ ] **Step 5: コミット**

```bash
cd .. && git add frontend/src/components/ui/Badge.tsx frontend/src/components/ui/Badge.test.tsx
git commit -m "feat(ui): add Badge component with cva variants"
```

---

### Task 3: Button コンポーネント（TDD）

**Files:**
- Create: `frontend/src/components/ui/Button.tsx`
- Create: `frontend/src/components/ui/Button.test.tsx`

- [ ] **Step 1: テストを先に書く**

`frontend/src/components/ui/Button.test.tsx` を作成:

```typescript
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { Button } from "./Button";

describe("Button", () => {
  it("renders children", () => {
    render(<Button>保存</Button>);
    expect(screen.getByRole("button", { name: "保存" })).toBeInTheDocument();
  });

  it("is enabled by default", () => {
    render(<Button>保存</Button>);
    expect(screen.getByRole("button")).toBeEnabled();
  });

  it("is disabled when loading", () => {
    render(<Button loading>保存</Button>);
    expect(screen.getByRole("button")).toBeDisabled();
  });

  it("shows loading text when loading", () => {
    render(<Button loading>保存</Button>);
    expect(screen.getByText("処理中...")).toBeInTheDocument();
  });

  it("applies primary variant classes", () => {
    const { container } = render(<Button variant="primary">送信</Button>);
    expect(container.firstChild).toHaveClass("bg-primary-600");
  });

  it("applies danger variant classes", () => {
    const { container } = render(<Button variant="danger">削除</Button>);
    expect(container.firstChild).toHaveClass("bg-red-600");
  });

  it("is disabled when disabled prop is set", () => {
    render(<Button disabled>保存</Button>);
    expect(screen.getByRole("button")).toBeDisabled();
  });
});
```

- [ ] **Step 2: テストが失敗することを確認**

```bash
cd frontend && npx vitest run src/components/ui/Button.test.tsx 2>&1 | tail -5
```

Expected: `Cannot find module './Button'` エラー。

- [ ] **Step 3: Button コンポーネントを実装**

`frontend/src/components/ui/Button.tsx` を作成:

```typescript
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary: "bg-primary-600 text-white hover:bg-primary-700 focus-visible:ring-primary-500",
        secondary: "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 focus-visible:ring-gray-400",
        ghost: "text-gray-700 hover:bg-gray-100 focus-visible:ring-gray-400",
        danger: "bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500",
      },
      size: {
        sm: "h-8 px-3 text-sm",
        md: "h-10 px-4 text-sm",
        lg: "h-11 px-6 text-base",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean;
  leftIcon?: React.ReactNode;
}

export function Button({
  className,
  variant,
  size,
  loading = false,
  leftIcon,
  children,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(buttonVariants({ variant, size }), className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <>
          <svg
            className="mr-2 h-4 w-4 animate-spin"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          処理中...
        </>
      ) : (
        <>
          {leftIcon && <span className="mr-2">{leftIcon}</span>}
          {children}
        </>
      )}
    </button>
  );
}
```

- [ ] **Step 4: テストが通ることを確認**

```bash
cd frontend && npx vitest run src/components/ui/Button.test.tsx 2>&1 | tail -5
```

Expected: `7 passed`.

- [ ] **Step 5: コミット**

```bash
cd .. && git add frontend/src/components/ui/Button.tsx frontend/src/components/ui/Button.test.tsx
git commit -m "feat(ui): add Button component with loading state"
```

---

### Task 4: Card + Skeleton コンポーネント

**Files:**
- Create: `frontend/src/components/ui/Card.tsx`
- Create: `frontend/src/components/ui/Card.test.tsx`
- Create: `frontend/src/components/ui/Skeleton.tsx`

- [ ] **Step 1: Card テストを書く**

`frontend/src/components/ui/Card.test.tsx` を作成:

```typescript
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { Card } from "./Card";

describe("Card", () => {
  it("renders children", () => {
    render(<Card>コンテンツ</Card>);
    expect(screen.getByText("コンテンツ")).toBeInTheDocument();
  });

  it("applies default md padding", () => {
    const { container } = render(<Card>コンテンツ</Card>);
    expect(container.firstChild).toHaveClass("p-6");
  });

  it("applies sm padding", () => {
    const { container } = render(<Card padding="sm">コンテンツ</Card>);
    expect(container.firstChild).toHaveClass("p-4");
  });

  it("applies no padding when none", () => {
    const { container } = render(<Card padding="none">コンテンツ</Card>);
    expect(container.firstChild).not.toHaveClass("p-4");
    expect(container.firstChild).not.toHaveClass("p-6");
  });

  it("accepts additional className", () => {
    const { container } = render(<Card className="extra">コンテンツ</Card>);
    expect(container.firstChild).toHaveClass("extra");
  });
});
```

- [ ] **Step 2: Card コンポーネントを実装**

`frontend/src/components/ui/Card.tsx` を作成:

```typescript
import { cn } from "@/lib/cn";

const paddingMap = {
  none: "",
  sm: "p-4",
  md: "p-6",
  lg: "p-8",
};

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  padding?: keyof typeof paddingMap;
}

export function Card({ className, padding = "md", children, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "bg-white rounded-lg shadow-sm border border-gray-200",
        paddingMap[padding],
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
```

- [ ] **Step 3: Skeleton コンポーネントを実装**

`frontend/src/components/ui/Skeleton.tsx` を作成:

```typescript
import { cn } from "@/lib/cn";

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {}

export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      className={cn("animate-pulse bg-gray-200 rounded", className)}
      {...props}
    />
  );
}
```

- [ ] **Step 4: テストが通ることを確認**

```bash
cd frontend && npx vitest run src/components/ui/Card.test.tsx 2>&1 | tail -5
```

Expected: `5 passed`.

- [ ] **Step 5: コミット**

```bash
cd .. && git add frontend/src/components/ui/Card.tsx frontend/src/components/ui/Card.test.tsx frontend/src/components/ui/Skeleton.tsx
git commit -m "feat(ui): add Card and Skeleton components"
```

---

### Task 5: StatCard コンポーネント（TDD）

**Files:**
- Create: `frontend/src/components/ui/StatCard.tsx`
- Create: `frontend/src/components/ui/StatCard.test.tsx`

- [ ] **Step 1: テストを先に書く**

`frontend/src/components/ui/StatCard.test.tsx` を作成:

```typescript
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { Building2 } from "lucide-react";
import { StatCard } from "./StatCard";

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <MemoryRouter>{children}</MemoryRouter>
);

describe("StatCard", () => {
  it("renders title and value", () => {
    render(
      <StatCard
        icon={<Building2 className="w-6 h-6 text-white" />}
        title="工事案件数"
        value={42}
        colorScheme="blue"
      />,
      { wrapper },
    );
    expect(screen.getByText("工事案件数")).toBeInTheDocument();
    expect(screen.getByText("42")).toBeInTheDocument();
  });

  it("renders label when provided", () => {
    render(
      <StatCard
        icon={<Building2 className="w-6 h-6 text-white" />}
        title="タイトル"
        value={10}
        label="サブラベル"
        colorScheme="green"
      />,
      { wrapper },
    );
    expect(screen.getByText("サブラベル")).toBeInTheDocument();
  });

  it("shows skeleton when loading", () => {
    const { container } = render(
      <StatCard
        icon={<Building2 className="w-6 h-6 text-white" />}
        title="タイトル"
        value={10}
        colorScheme="blue"
        loading
      />,
      { wrapper },
    );
    expect(container.querySelector(".animate-pulse")).toBeInTheDocument();
    expect(screen.queryByText("10")).not.toBeInTheDocument();
  });

  it("renders as a link when to prop is given", () => {
    render(
      <StatCard
        icon={<Building2 className="w-6 h-6 text-white" />}
        title="タイトル"
        value={5}
        colorScheme="red"
        to="/projects"
      />,
      { wrapper },
    );
    expect(screen.getByRole("link")).toHaveAttribute("href", "/projects");
  });

  it("renders as a div when to prop is not given", () => {
    render(
      <StatCard
        icon={<Building2 className="w-6 h-6 text-white" />}
        title="タイトル"
        value={5}
        colorScheme="red"
      />,
      { wrapper },
    );
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: テストが失敗することを確認**

```bash
cd frontend && npx vitest run src/components/ui/StatCard.test.tsx 2>&1 | tail -5
```

Expected: `Cannot find module './StatCard'` エラー。

- [ ] **Step 3: StatCard コンポーネントを実装**

`frontend/src/components/ui/StatCard.tsx` を作成:

```typescript
import { Link } from "react-router-dom";
import { cn } from "@/lib/cn";
import { Skeleton } from "./Skeleton";

const colorSchemeMap = {
  blue: "bg-blue-500",
  green: "bg-green-500",
  yellow: "bg-yellow-500",
  red: "bg-red-500",
  purple: "bg-purple-500",
  orange: "bg-orange-500",
};

export interface StatCardProps {
  icon: React.ReactNode;
  title: string;
  value: number | string;
  to?: string;
  colorScheme: keyof typeof colorSchemeMap;
  label?: string;
  loading?: boolean;
  className?: string;
}

export function StatCard({
  icon,
  title,
  value,
  to,
  colorScheme,
  label,
  loading = false,
  className,
}: StatCardProps) {
  const content = (
    <div className="flex items-center justify-between">
      <div className="min-w-0">
        <p className="text-sm text-gray-500 truncate">{title}</p>
        {loading ? (
          <Skeleton className="h-8 w-16 mt-1" />
        ) : (
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
        )}
        {label && !loading && (
          <p className="text-xs text-gray-400 mt-0.5">{label}</p>
        )}
      </div>
      <div
        className={cn(
          "p-3 rounded-full flex-shrink-0 ml-3",
          colorSchemeMap[colorScheme],
        )}
      >
        {icon}
      </div>
    </div>
  );

  const baseClass = cn(
    "bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow",
    className,
  );

  if (to) {
    return (
      <Link to={to} className={cn(baseClass, "block")}>
        {content}
      </Link>
    );
  }

  return <div className={baseClass}>{content}</div>;
}
```

- [ ] **Step 4: テストが通ることを確認**

```bash
cd frontend && npx vitest run src/components/ui/StatCard.test.tsx 2>&1 | tail -5
```

Expected: `5 passed`.

- [ ] **Step 5: コミット**

```bash
cd .. && git add frontend/src/components/ui/StatCard.tsx frontend/src/components/ui/StatCard.test.tsx
git commit -m "feat(ui): add StatCard component with loading state and optional link"
```

---

### Task 6: barrel export + 全テスト確認

**Files:**
- Create: `frontend/src/components/ui/index.ts`

- [ ] **Step 1: index.ts を作成**

`frontend/src/components/ui/index.ts` を作成:

```typescript
export { Badge } from "./Badge";
export type { BadgeProps } from "./Badge";
export { Button } from "./Button";
export type { ButtonProps } from "./Button";
export { Card } from "./Card";
export type { CardProps } from "./Card";
export { Skeleton } from "./Skeleton";
export type { SkeletonProps } from "./Skeleton";
export { StatCard } from "./StatCard";
export type { StatCardProps } from "./StatCard";
```

- [ ] **Step 2: 全ユニットテストを実行**

```bash
cd frontend && npx vitest run 2>&1 | tail -15
```

Expected: 既存テスト + 新規テストすべて `passed`（37件 + 新規約22件 = 59件以上）。

- [ ] **Step 3: TypeScript チェック**

```bash
cd frontend && npx tsc --noEmit 2>&1 | head -20
```

Expected: エラーなし。

- [ ] **Step 4: コミット**

```bash
cd .. && git add frontend/src/components/ui/index.ts
git commit -m "feat(ui): add barrel export for ui components"
```

---

## Phase 2: KPI API接続 + ダッシュボードリファクタ

### Task 7: Dashboard API クライアント（TDD）

**Files:**
- Create: `frontend/src/api/dashboard.ts`

- [ ] **Step 1: dashboard.ts を作成**

`frontend/src/api/dashboard.ts` を作成:

```typescript
import { useQuery } from "@tanstack/react-query";
import api from "./client";

// TypeScript types matching backend app/schemas/dashboard.py
export interface ProjectStats {
  total: number;
  planning: number;
  in_progress: number;
  on_hold: number;
  completed: number;
}

export interface IncidentStats {
  total: number;
  open: number;
  in_progress: number;
  resolved: number;
}

export interface CostOverview {
  total_budgeted: number;
  total_actual: number;
  variance: number;
  variance_rate: number;
}

export interface DashboardKPI {
  projects: ProjectStats;
  incidents: IncidentStats;
  cost_overview: CostOverview;
  daily_reports_count: number;
  photos_count: number;
  users_count: number;
}

export async function fetchDashboardKPI(): Promise<DashboardKPI> {
  const res = await api.get<{ data: DashboardKPI }>("/dashboard/kpi");
  return res.data.data;
}

export function useDashboardKPI() {
  return useQuery<DashboardKPI>({
    queryKey: ["dashboard", "kpi"],
    queryFn: fetchDashboardKPI,
    staleTime: 30_000,
    retry: 2,
  });
}
```

- [ ] **Step 2: TypeScript チェック**

```bash
cd frontend && npx tsc --noEmit 2>&1 | head -20
```

Expected: エラーなし。

- [ ] **Step 3: コミット**

```bash
cd .. && git add frontend/src/api/dashboard.ts
git commit -m "feat(api): add DashboardKPI API client and React Query hook"
```

---

### Task 8: DashboardPage リファクタ

**Files:**
- Modify: `frontend/src/pages/DashboardPage.tsx`

- [ ] **Step 1: DashboardPage を書き換える**

`frontend/src/pages/DashboardPage.tsx` を以下で完全置換:

```typescript
import { useQuery } from "@tanstack/react-query";
import {
  Building2,
  FileText,
  HardHat,
  AlertCircle,
  TrendingUp,
  PlusCircle,
  ClipboardList,
  ShieldCheck,
  Camera,
  Bug,
} from "lucide-react";
import { Link } from "react-router-dom";
import { projectsApi } from "@/api/projects";
import { itsmApi } from "@/api/itsm";
import { useDashboardKPI } from "@/api/dashboard";
import { useAuthStore } from "@/stores/authStore";
import { StatCard, Skeleton } from "@/components/ui";

const PRIORITY_COLORS: Record<string, string> = {
  CRITICAL: "bg-red-600 text-white",
  HIGH: "bg-orange-500 text-white",
  MEDIUM: "bg-yellow-500 text-white",
  LOW: "bg-gray-200 text-gray-700",
};

const PRIORITY_LABELS: Record<string, string> = {
  CRITICAL: "致命的",
  HIGH: "高",
  MEDIUM: "中",
  LOW: "低",
};

// StatusBadge and IncidentStatusBadge remain local (used in tables below)
function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    PLANNING: "badge-info",
    IN_PROGRESS: "badge-success",
    ON_HOLD: "badge-warning",
    COMPLETED: "badge-info",
    CANCELLED: "badge-danger",
  };
  const labels: Record<string, string> = {
    PLANNING: "計画中",
    IN_PROGRESS: "進行中",
    ON_HOLD: "保留",
    COMPLETED: "完了",
    CANCELLED: "中止",
  };
  return (
    <span className={map[status] ?? "badge-info"}>{labels[status] ?? status}</span>
  );
}

function IncidentStatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    OPEN: "badge-danger",
    IN_PROGRESS: "badge-warning",
    RESOLVED: "badge-success",
    CLOSED: "badge-info",
  };
  const labels: Record<string, string> = {
    OPEN: "未対応",
    IN_PROGRESS: "対応中",
    RESOLVED: "解決済",
    CLOSED: "クローズ",
  };
  return (
    <span className={map[status] ?? "badge-info"}>{labels[status] ?? status}</span>
  );
}

function QuickActionCard({
  to,
  icon: Icon,
  label,
  color,
}: {
  to: string;
  icon: typeof PlusCircle;
  label: string;
  color: string;
}) {
  return (
    <Link
      to={to}
      className="card flex flex-col items-center gap-3 py-5 hover:shadow-md hover:scale-[1.02] transition-all text-center"
    >
      <div className={`p-3 rounded-full ${color}`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
      <span className="text-sm font-medium text-gray-700">{label}</span>
    </Link>
  );
}

export default function DashboardPage() {
  const { user } = useAuthStore();

  const { data: kpi, isLoading: loadingKpi, isError: kpiError, refetch: refetchKpi } = useDashboardKPI();

  const { data: recentProjects, isLoading: loadingRecent } = useQuery({
    queryKey: ["dashboard-projects-recent"],
    queryFn: () => projectsApi.list(1, 5),
  });

  const { data: recentIncidents, isLoading: loadingIncidents } = useQuery({
    queryKey: ["dashboard-incidents-recent"],
    queryFn: () => itsmApi.listIncidents(1, 3),
  });

  const today = new Date().toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            こんにちは、{user?.full_name ?? "ユーザー"}さん
          </h2>
          <p className="text-gray-500 text-sm mt-1">ServiceHub 工事管理プラットフォーム</p>
        </div>
        <p className="text-sm text-gray-400 mt-1 hidden sm:block">{today}</p>
      </div>

      {/* KPI Error Banner */}
      {kpiError && (
        <div
          role="alert"
          className="rounded-lg bg-red-50 border border-red-200 p-4 flex items-center justify-between"
        >
          <p className="text-sm text-red-700">KPI データの取得に失敗しました。</p>
          <button
            onClick={() => refetchKpi()}
            className="text-sm text-red-600 hover:text-red-800 font-medium underline"
          >
            再試行
          </button>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" data-testid="stats-grid">
        <StatCard
          title="工事案件数 (合計)"
          value={kpi?.projects.total ?? 0}
          icon={<Building2 className="w-6 h-6 text-white" />}
          to="/projects"
          colorScheme="blue"
          label="全登録案件"
          loading={loadingKpi}
        />
        <StatCard
          title="進行中案件"
          value={kpi?.projects.in_progress ?? 0}
          icon={<TrendingUp className="w-6 h-6 text-white" />}
          to="/projects"
          colorScheme="green"
          label="IN_PROGRESS"
          loading={loadingKpi}
        />
        <StatCard
          title="今月の日報"
          value={kpi?.daily_reports_count ?? 0}
          icon={<FileText className="w-6 h-6 text-white" />}
          to="/reports"
          colorScheme="purple"
          label="登録件数合計"
          loading={loadingKpi}
        />
        <StatCard
          title="インシデント"
          value={(kpi?.incidents.open ?? 0) + (kpi?.incidents.in_progress ?? 0)}
          icon={<AlertCircle className="w-6 h-6 text-white" />}
          to="/itsm"
          colorScheme="red"
          label="未解決件数"
          loading={loadingKpi}
        />
      </div>

      {/* Quick Actions */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-3">クイックアクション</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <QuickActionCard to="/projects" icon={PlusCircle} label="新規案件作成" color="bg-blue-500" />
          <QuickActionCard to="/reports" icon={ClipboardList} label="日報入力" color="bg-purple-500" />
          <QuickActionCard to="/safety" icon={ShieldCheck} label="安全チェック" color="bg-green-600" />
          <QuickActionCard to="/photos" icon={Camera} label="写真アップロード" color="bg-orange-500" />
          <QuickActionCard to="/itsm" icon={Bug} label="インシデント登録" color="bg-red-500" />
        </div>
      </div>

      {/* Bottom Grid: Recent Projects + Recent Incidents */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Projects Table */}
        <div className="card lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">最近の工事案件</h3>
            <Link to="/projects" className="text-sm text-primary-600 hover:text-primary-700">
              すべて表示 →
            </Link>
          </div>

          {loadingRecent ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : recentProjects && recentProjects.data.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-400 border-b border-gray-100">
                    <th className="pb-2 font-medium">案件名</th>
                    <th className="pb-2 font-medium hidden sm:table-cell">施主名</th>
                    <th className="pb-2 font-medium">ステータス</th>
                    <th className="pb-2 font-medium hidden md:table-cell">開始日</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {recentProjects.data.map((p) => (
                    <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                      <td className="py-3 pr-2">
                        <Link
                          to={`/projects/${p.id}`}
                          className="font-medium text-gray-900 hover:text-primary-600 block truncate max-w-[160px]"
                        >
                          {p.name}
                        </Link>
                        <span className="text-xs text-gray-400">{p.project_code}</span>
                      </td>
                      <td className="py-3 pr-2 hidden sm:table-cell text-gray-600 truncate max-w-[120px]">
                        {p.client_name}
                      </td>
                      <td className="py-3 pr-2">
                        <StatusBadge status={p.status} />
                      </td>
                      <td className="py-3 hidden md:table-cell text-gray-500 whitespace-nowrap">
                        {p.start_date
                          ? new Date(p.start_date).toLocaleDateString("ja-JP")
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400">
              <Building2 className="w-10 h-10 mx-auto mb-2" />
              <p className="text-sm">案件がありません</p>
            </div>
          )}
        </div>

        {/* Recent Incidents */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">最近のインシデント</h3>
            <Link to="/itsm" className="text-sm text-primary-600 hover:text-primary-700">
              すべて表示 →
            </Link>
          </div>

          {loadingIncidents ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : recentIncidents && recentIncidents.data.length > 0 ? (
            <div className="space-y-3">
              {recentIncidents.data.map((inc) => (
                <Link
                  key={inc.id}
                  to="/itsm"
                  className="block p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <span className="text-xs text-gray-400 font-mono shrink-0">
                      {inc.incident_number}
                    </span>
                    <span
                      className={`text-xs px-1.5 py-0.5 rounded font-medium shrink-0 ${
                        PRIORITY_COLORS[inc.priority] ?? "bg-gray-200 text-gray-700"
                      }`}
                    >
                      {PRIORITY_LABELS[inc.priority] ?? inc.priority}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-gray-800 leading-snug line-clamp-2">
                    {inc.title}
                  </p>
                  <div className="flex items-center justify-between mt-2">
                    <IncidentStatusBadge status={inc.status} />
                    <span className="text-xs text-gray-400">
                      {new Date(inc.created_at).toLocaleDateString("ja-JP")}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400">
              <HardHat className="w-10 h-10 mx-auto mb-2" />
              <p className="text-sm">インシデントなし</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: TypeScript チェックとビルド確認**

```bash
cd frontend && npx tsc --noEmit 2>&1 | head -20
```

Expected: エラーなし。

```bash
cd frontend && npx vitest run 2>&1 | tail -10
```

Expected: 全テスト passed（既存テストがリグレッションしていないこと）。

- [ ] **Step 3: コミット**

```bash
cd .. && git add frontend/src/pages/DashboardPage.tsx
git commit -m "feat(dashboard): connect KPI API and use shared UI components"
```

---

## Phase 3: E2E テスト整備

### Task 9: E2E 共通フィクスチャ作成

**Files:**
- Create: `frontend/e2e/fixtures/api-mocks.ts`

- [ ] **Step 1: fixtures ディレクトリを作成して api-mocks.ts を書く**

`frontend/e2e/fixtures/api-mocks.ts` を作成:

```typescript
import type { Page } from "@playwright/test";
import type { DashboardKPI } from "../../src/api/dashboard";

// ─── Mock Data ────────────────────────────────────────────────────────────────

export const MOCK_TOKEN = "mock-jwt-token-for-testing";

export const MOCK_USER = {
  id: "1",
  email: "test@example.com",
  full_name: "テスト管理者",
  role: "ADMIN",
  is_active: true,
};

export const MOCK_KPI: DashboardKPI = {
  projects: { total: 10, planning: 2, in_progress: 5, on_hold: 1, completed: 2 },
  incidents: { total: 8, open: 3, in_progress: 2, resolved: 3 },
  cost_overview: {
    total_budgeted: 10_000_000,
    total_actual: 9_200_000,
    variance: -800_000,
    variance_rate: -0.08,
  },
  daily_reports_count: 24,
  photos_count: 156,
  users_count: 12,
};

export const MOCK_PROJECTS = {
  success: true,
  data: [
    {
      id: "p1",
      project_code: "PRJ-001",
      name: "渋谷オフィスビル新築工事",
      description: "テスト案件1",
      client_name: "株式会社テスト建設",
      site_address: "東京都渋谷区",
      status: "IN_PROGRESS",
      budget: 50_000_000,
      start_date: "2026-01-01",
      end_date: "2026-12-31",
      manager_id: "1",
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
    },
    {
      id: "p2",
      project_code: "PRJ-002",
      name: "横浜マンション改修工事",
      description: "テスト案件2",
      client_name: "株式会社横浜開発",
      site_address: "神奈川県横浜市",
      status: "PLANNING",
      budget: 30_000_000,
      start_date: "2026-03-01",
      end_date: "2026-09-30",
      manager_id: null,
      created_at: "2026-02-01T00:00:00Z",
      updated_at: "2026-02-01T00:00:00Z",
    },
  ],
  meta: { page: 1, per_page: 20, total: 2, total_pages: 1 },
};

export const MOCK_INCIDENTS = {
  success: true,
  data: [
    {
      id: "i1",
      incident_number: "INC-001",
      title: "本番サーバー応答遅延",
      description: "テストインシデント",
      category: "infrastructure",
      priority: "HIGH",
      severity: "HIGH",
      status: "OPEN",
      assigned_to: null,
      project_id: null,
      resolution: null,
      resolved_at: null,
      created_at: "2026-04-01T10:00:00Z",
      updated_at: "2026-04-01T10:00:00Z",
    },
  ],
  meta: { page: 1, per_page: 20, total: 3, total_pages: 1 },
};

// ─── Setup Helpers ────────────────────────────────────────────────────────────

/** Mock auth endpoints (login + me) */
export async function setupAuthMocks(page: Page): Promise<void> {
  await page.route("**/api/v1/auth/login", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        access_token: MOCK_TOKEN,
        refresh_token: "mock-refresh-token",
        token_type: "bearer",
      }),
    }),
  );
  await page.route("**/api/v1/auth/me", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ data: MOCK_USER }),
    }),
  );
}

/** Mock dashboard KPI endpoint */
export async function setupDashboardMocks(page: Page): Promise<void> {
  await page.route("**/api/v1/dashboard/kpi", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ data: MOCK_KPI }),
    }),
  );
}

/** Mock projects list endpoint */
export async function setupProjectsMocks(page: Page): Promise<void> {
  await page.route("**/api/v1/projects**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(MOCK_PROJECTS),
    }),
  );
}

/** Mock ITSM incidents list endpoint */
export async function setupIncidentsMocks(page: Page): Promise<void> {
  await page.route("**/api/v1/itsm/incidents**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(MOCK_INCIDENTS),
    }),
  );
}

/** Setup all API mocks (auth + all domains) */
export async function setupAllApiMocks(page: Page): Promise<void> {
  await setupAuthMocks(page);
  await setupDashboardMocks(page);
  await setupProjectsMocks(page);
  await setupIncidentsMocks(page);
}

/** Login and navigate to dashboard */
export async function loginAndNavigate(page: Page): Promise<void> {
  await setupAllApiMocks(page);
  await page.goto("/login");
  await page.getByLabel("メールアドレス").fill("test@example.com");
  await page.getByLabel("パスワード").fill("password123");
  await page.getByRole("button", { name: "ログイン" }).click();
  await page.waitForURL(/\/dashboard/);
}
```

- [ ] **Step 2: TypeScript チェック**

```bash
cd frontend && npx tsc --noEmit 2>&1 | head -20
```

Expected: エラーなし。

- [ ] **Step 3: コミット**

```bash
cd .. && git add frontend/e2e/fixtures/api-mocks.ts
git commit -m "test(e2e): add shared API mock fixtures"
```

---

### Task 10: login.spec.ts 拡張

**Files:**
- Modify: `frontend/e2e/login.spec.ts`

- [ ] **Step 1: ログイン成功とログアウトのテストを追加**

`frontend/e2e/login.spec.ts` を以下で完全置換:

```typescript
import { test, expect } from "@playwright/test";
import { setupAuthMocks, setupAllApiMocks } from "./fixtures/api-mocks";

test.describe("Login Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
  });

  test("displays login form with title and inputs", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: /ServiceHub 工事管理/ }),
    ).toBeVisible();
    await expect(page.getByLabel("メールアドレス")).toBeVisible();
    await expect(page.getByLabel("パスワード")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "ログイン" }),
    ).toBeVisible();
  });

  test("email input has placeholder", async ({ page }) => {
    const emailInput = page.getByLabel("メールアドレス");
    await expect(emailInput).toHaveAttribute("placeholder", "admin@example.com");
  });

  test("login button is enabled by default", async ({ page }) => {
    const button = page.getByRole("button", { name: "ログイン" });
    await expect(button).toBeEnabled();
  });

  test("redirects unauthenticated users to login", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/);
  });

  test("shows error on invalid credentials", async ({ page }) => {
    await page.getByLabel("メールアドレス").fill("invalid@example.com");
    await page.getByLabel("パスワード").fill("wrongpassword");
    await page.getByRole("button", { name: "ログイン" }).click();
    await expect(
      page.getByText("メールアドレスまたはパスワードが正しくありません"),
    ).toBeVisible({ timeout: 10_000 });
  });

  test("successful login redirects to dashboard", async ({ page }) => {
    await setupAllApiMocks(page);
    await page.getByLabel("メールアドレス").fill("test@example.com");
    await page.getByLabel("パスワード").fill("password123");
    await page.getByRole("button", { name: "ログイン" }).click();
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10_000 });
  });

  test("logout button redirects to login", async ({ page }) => {
    await setupAllApiMocks(page);
    // Login first
    await page.getByLabel("メールアドレス").fill("test@example.com");
    await page.getByLabel("パスワード").fill("password123");
    await page.getByRole("button", { name: "ログイン" }).click();
    await page.waitForURL(/\/dashboard/);
    // Logout
    await page.getByRole("button", { name: /ログアウト/ }).click();
    await expect(page).toHaveURL(/\/login/);
  });
});
```

- [ ] **Step 2: E2E テストを実行（ヘッドレス）**

```bash
cd frontend && npx playwright test e2e/login.spec.ts --reporter=list 2>&1 | tail -20
```

Expected: 全テスト passed（`shows error` テストはバックエンド未起動のため skip または fail 可。他は passed）。

> **注意:** `shows error on invalid credentials` テストはバックエンドへの実接続が必要。CI では skip される。それ以外のテストはモックで動作する。

- [ ] **Step 3: コミット**

```bash
cd .. && git add frontend/e2e/login.spec.ts
git commit -m "test(e2e): extend login spec with success and logout flows"
```

---

### Task 11: navigation.spec.ts 拡張

**Files:**
- Modify: `frontend/e2e/navigation.spec.ts`

- [ ] **Step 1: 認証済みナビゲーションテストを追加**

`frontend/e2e/navigation.spec.ts` を以下で完全置換:

```typescript
import { test, expect } from "@playwright/test";
import { loginAndNavigate } from "./fixtures/api-mocks";

test.describe("Navigation", () => {
  test("root redirects to login when not authenticated", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/login/);
  });

  test("all protected routes redirect to login when not authenticated", async ({ page }) => {
    const protectedRoutes = [
      "/dashboard",
      "/projects",
      "/reports",
      "/safety",
      "/itsm",
      "/knowledge",
      "/cost",
      "/photos",
      "/users",
    ];

    for (const route of protectedRoutes) {
      await page.goto(route);
      await expect(page).toHaveURL(/\/login/, { timeout: 5_000 });
    }
  });

  test("login page has correct page title", async ({ page }) => {
    await page.goto("/login");
    await expect(page).toHaveTitle(/ServiceHub/);
  });

  test("authenticated user can access dashboard", async ({ page }) => {
    await loginAndNavigate(page);
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByText(/こんにちは/)).toBeVisible();
  });

  test("sidebar navigation links are visible on dashboard", async ({ page }) => {
    await loginAndNavigate(page);
    // Verify key nav links exist in layout
    await expect(page.getByRole("link", { name: /ダッシュボード/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /工事案件/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /日報/ })).toBeVisible();
  });
});
```

- [ ] **Step 2: テストを実行**

```bash
cd frontend && npx playwright test e2e/navigation.spec.ts --reporter=list 2>&1 | tail -15
```

Expected: `root redirects`, `all protected routes`, `login page title`, `authenticated user can access dashboard`, `sidebar navigation links` が passed。

- [ ] **Step 3: コミット**

```bash
cd .. && git add frontend/e2e/navigation.spec.ts
git commit -m "test(e2e): extend navigation spec with authenticated flow"
```

---

### Task 12: dashboard.spec.ts

**Files:**
- Create: `frontend/e2e/dashboard.spec.ts`

- [ ] **Step 1: dashboard.spec.ts を作成**

`frontend/e2e/dashboard.spec.ts` を作成:

```typescript
import { test, expect } from "@playwright/test";
import {
  loginAndNavigate,
  setupAuthMocks,
  setupProjectsMocks,
  setupIncidentsMocks,
  MOCK_KPI,
} from "./fixtures/api-mocks";

test.describe("Dashboard Page", () => {
  test("shows KPI stat cards with data", async ({ page }) => {
    await loginAndNavigate(page);

    // Stats grid should be visible
    const statsGrid = page.getByTestId("stats-grid");
    await expect(statsGrid).toBeVisible();

    // KPI values from MOCK_KPI
    await expect(page.getByText(`${MOCK_KPI.projects.total}`)).toBeVisible();
    await expect(page.getByText(`${MOCK_KPI.projects.in_progress}`)).toBeVisible();
    await expect(page.getByText(`${MOCK_KPI.daily_reports_count}`)).toBeVisible();
  });

  test("shows skeleton while KPI is loading", async ({ page }) => {
    await setupAuthMocks(page);
    await setupProjectsMocks(page);
    await setupIncidentsMocks(page);

    // Delay KPI response to observe loading state
    await page.route("**/api/v1/dashboard/kpi", async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ data: MOCK_KPI }),
      });
    });

    await page.goto("/login");
    await page.getByLabel("メールアドレス").fill("test@example.com");
    await page.getByLabel("パスワード").fill("password123");
    await page.getByRole("button", { name: "ログイン" }).click();
    await page.waitForURL(/\/dashboard/);

    // Skeleton should be present during loading
    const skeleton = page.locator(".animate-pulse").first();
    await expect(skeleton).toBeVisible({ timeout: 3_000 });
  });

  test("shows error banner when KPI API fails", async ({ page }) => {
    await setupAuthMocks(page);
    await setupProjectsMocks(page);
    await setupIncidentsMocks(page);

    await page.route("**/api/v1/dashboard/kpi", (route) =>
      route.fulfill({ status: 500, body: "Internal Server Error" }),
    );

    await page.goto("/login");
    await page.getByLabel("メールアドレス").fill("test@example.com");
    await page.getByLabel("パスワード").fill("password123");
    await page.getByRole("button", { name: "ログイン" }).click();
    await page.waitForURL(/\/dashboard/);

    await expect(page.getByRole("alert")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("KPI データの取得に失敗しました")).toBeVisible();
    await expect(page.getByRole("button", { name: "再試行" })).toBeVisible();
  });

  test("shows quick action cards", async ({ page }) => {
    await loginAndNavigate(page);
    await expect(page.getByText("新規案件作成")).toBeVisible();
    await expect(page.getByText("日報入力")).toBeVisible();
    await expect(page.getByText("安全チェック")).toBeVisible();
  });
});
```

- [ ] **Step 2: テストを実行**

```bash
cd frontend && npx playwright test e2e/dashboard.spec.ts --reporter=list 2>&1 | tail -20
```

Expected: 4件すべて passed（または skeleton テストは timing により skip 可）。

- [ ] **Step 3: コミット**

```bash
cd .. && git add frontend/e2e/dashboard.spec.ts
git commit -m "test(e2e): add dashboard spec with KPI loading and error states"
```

---

### Task 13: 主要ページ E2E テスト（projects / reports / safety / cost）

**Files:**
- Create: `frontend/e2e/projects.spec.ts`
- Create: `frontend/e2e/reports.spec.ts`
- Create: `frontend/e2e/safety.spec.ts`
- Create: `frontend/e2e/cost.spec.ts`

- [ ] **Step 1: projects.spec.ts を作成**

`frontend/e2e/projects.spec.ts` を作成:

```typescript
import { test, expect } from "@playwright/test";
import { loginAndNavigate, MOCK_PROJECTS } from "./fixtures/api-mocks";

test.describe("Projects Page", () => {
  test.beforeEach(async ({ page }) => {
    await loginAndNavigate(page);
    await page.getByRole("link", { name: /工事案件/ }).click();
    await page.waitForURL(/\/projects/);
  });

  test("shows page heading", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: "工事案件一覧" }),
    ).toBeVisible();
  });

  test("lists project names from API", async ({ page }) => {
    await expect(page.getByText(MOCK_PROJECTS.data[0].name)).toBeVisible();
    await expect(page.getByText(MOCK_PROJECTS.data[1].name)).toBeVisible();
  });

  test("shows new project button", async ({ page }) => {
    await expect(
      page.getByRole("button", { name: /新規/ }),
    ).toBeVisible();
  });

  test("shows search input", async ({ page }) => {
    await expect(page.getByPlaceholder(/検索/)).toBeVisible();
  });
});
```

- [ ] **Step 2: reports.spec.ts を作成**

`frontend/e2e/reports.spec.ts` を作成:

```typescript
import { test, expect } from "@playwright/test";
import { loginAndNavigate } from "./fixtures/api-mocks";

test.describe("Daily Reports Page", () => {
  test.beforeEach(async ({ page }) => {
    await loginAndNavigate(page);
    await page.getByRole("link", { name: /日報/ }).click();
    await page.waitForURL(/\/reports/);
  });

  test("shows page heading", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: /日報/ }),
    ).toBeVisible();
  });

  test("shows new report button", async ({ page }) => {
    await expect(
      page.getByRole("button", { name: /新規/ }),
    ).toBeVisible();
  });
});
```

- [ ] **Step 3: safety.spec.ts を作成**

`frontend/e2e/safety.spec.ts` を作成:

```typescript
import { test, expect } from "@playwright/test";
import { loginAndNavigate } from "./fixtures/api-mocks";

test.describe("Safety Page", () => {
  test.beforeEach(async ({ page }) => {
    await loginAndNavigate(page);
    await page.getByRole("link", { name: /安全/ }).click();
    await page.waitForURL(/\/safety/);
  });

  test("shows page heading", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: /安全/ }),
    ).toBeVisible();
  });

  test("shows safety checks tab", async ({ page }) => {
    await expect(page.getByRole("tab", { name: /安全点検/ })).toBeVisible();
  });
});
```

- [ ] **Step 4: cost.spec.ts を作成**

`frontend/e2e/cost.spec.ts` を作成:

```typescript
import { test, expect } from "@playwright/test";
import { loginAndNavigate } from "./fixtures/api-mocks";

test.describe("Cost Page", () => {
  test.beforeEach(async ({ page }) => {
    await loginAndNavigate(page);
    await page.getByRole("link", { name: /コスト/ }).click();
    await page.waitForURL(/\/cost/);
  });

  test("shows page heading", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: /コスト/ }),
    ).toBeVisible();
  });

  test("shows new record button", async ({ page }) => {
    await expect(
      page.getByRole("button", { name: /新規/ }),
    ).toBeVisible();
  });
});
```

- [ ] **Step 5: 全 E2E テストを実行**

```bash
cd frontend && npx playwright test --reporter=list 2>&1 | tail -30
```

Expected: 大半のテストが passed。ナビゲーションリンク名が実際の実装と異なる場合はエラーメッセージを確認してセレクタを修正する。

- [ ] **Step 6: コミット**

```bash
cd .. && git add frontend/e2e/projects.spec.ts frontend/e2e/reports.spec.ts frontend/e2e/safety.spec.ts frontend/e2e/cost.spec.ts
git commit -m "test(e2e): add main page specs for projects, reports, safety, cost"
```

---

### Task 14: CI に E2E ジョブを追加

**Files:**
- Modify: `.github/workflows/ci-frontend.yml`

- [ ] **Step 1: E2E ジョブを ci-frontend.yml に追加**

`.github/workflows/ci-frontend.yml` の末尾に以下を追加（既存の `test:` ジョブの後）:

```yaml
  e2e:
    name: E2E Tests (Playwright)
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: frontend
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: npm
          cache-dependency-path: frontend/package-lock.json
      - run: npm ci --legacy-peer-deps
      - name: Install Playwright browsers
        run: npx playwright install --with-deps chromium
      - name: Run E2E tests
        run: npx playwright test --reporter=github
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: frontend/playwright-report/
          retention-days: 7
```

- [ ] **Step 2: YAML 構文チェック**

```bash
python3 -c "import yaml; yaml.safe_load(open('.github/workflows/ci-frontend.yml'))" && echo "YAML OK"
```

Expected: `YAML OK`。

- [ ] **Step 3: コミット**

```bash
git add .github/workflows/ci-frontend.yml
git commit -m "ci: add Playwright E2E test job to frontend workflow"
```

---

### Task 15: 最終 Verify + PR 準備

- [ ] **Step 1: 全ユニットテスト実行**

```bash
cd frontend && npx vitest run --reporter=verbose 2>&1 | tail -20
```

Expected: 全テスト passed。件数が 59 件以上であること。

- [ ] **Step 2: 全 E2E テスト実行**

```bash
cd frontend && npx playwright test --reporter=list 2>&1 | tail -30
```

Expected: エラー件数を記録する。バックエンド依存テスト（`shows error on invalid credentials`）以外は passed。

- [ ] **Step 3: Lint**

```bash
cd frontend && npm run lint 2>&1 | tail -10
```

Expected: エラーなし（警告は許容）。

- [ ] **Step 4: Build**

```bash
cd frontend && npm run build 2>&1 | tail -10
```

Expected: `dist/` が生成される。エラーなし。

- [ ] **Step 5: TypeScript 最終チェック**

```bash
cd frontend && npx tsc --noEmit 2>&1 | head -20
```

Expected: エラーなし。

- [ ] **Step 6: 未コミットファイルの確認・コミット**

```bash
cd .. && git status
```

未コミットのファイル（`.gitignore` の変更など）があればコミット:

```bash
git add .gitignore
git commit -m "chore: update gitignore"
```

- [ ] **Step 7: push して PR を作成**

```bash
git push -u origin feat/e2e-playwright-and-ui-components
```

その後 GitHub PR を作成:
- タイトル: `feat: E2E テスト基盤 + 共通UIコンポーネント + KPI API接続`
- ベースブランチ: `main`
- PR 本文に変更内容・テスト結果・影響範囲・残課題を記載

---

## 成功基準チェックリスト

| 項目 | 基準 |
|------|------|
| 共通コンポーネント | Badge / Button / Card / Skeleton / StatCard が `@/components/ui` から import できる |
| ユニットテスト | `npx vitest run` が全件 passed（59 件以上） |
| KPI API | DashboardPage が `useDashboardKPI()` を使用し loading/error 状態が動作 |
| E2E テスト | `npx playwright test` で 25 件以上が passed |
| CI | E2E ジョブが ci-frontend.yml に追加されている |
| Lint | `npm run lint` エラーなし |
| Build | `npm run build` 成功 |
| TypeScript | `tsc --noEmit` エラーなし |
