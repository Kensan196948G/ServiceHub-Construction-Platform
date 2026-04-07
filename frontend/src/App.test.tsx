import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import App from "./App";

vi.mock("@/stores/authStore", () => ({
  useAuthStore: vi.fn(),
}));

// Mock all page components to avoid deep rendering
vi.mock("@/pages/auth/LoginPage", () => ({ default: () => <div data-testid="login-page">LoginPage</div> }));
vi.mock("@/pages/DashboardPage", () => ({ default: () => <div data-testid="dashboard-page">DashboardPage</div> }));
vi.mock("@/pages/projects/ProjectsPage", () => ({ default: () => <div data-testid="projects-page">ProjectsPage</div> }));
vi.mock("@/pages/projects/ProjectDetailPage", () => ({ default: () => <div data-testid="project-detail">ProjectDetail</div> }));
vi.mock("@/pages/reports/DailyReportsPage", () => ({ default: () => <div data-testid="reports-page">ReportsPage</div> }));
vi.mock("@/pages/safety/SafetyPage", () => ({ default: () => <div data-testid="safety-page">SafetyPage</div> }));
vi.mock("@/pages/itsm/ItsmPage", () => ({ default: () => <div data-testid="itsm-page">ItsmPage</div> }));
vi.mock("@/pages/knowledge/KnowledgePage", () => ({ default: () => <div data-testid="knowledge-page">KnowledgePage</div> }));
vi.mock("@/pages/cost/CostPage", () => ({ default: () => <div data-testid="cost-page">CostPage</div> }));
vi.mock("@/pages/photos/PhotosPage", () => ({ default: () => <div data-testid="photos-page">PhotosPage</div> }));
vi.mock("@/pages/users/UsersPage", () => ({ default: () => <div data-testid="users-page">UsersPage</div> }));
vi.mock("@/components/layout/Layout", async () => {
  const { Outlet } = await import("react-router-dom");
  return { default: () => <div data-testid="layout"><Outlet /></div> };
});

import { useAuthStore } from "@/stores/authStore";

describe("App", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("未認証の場合、/login にリダイレクトする", () => {
    vi.mocked(useAuthStore).mockImplementation((selector: (s: { token: string | null }) => unknown) =>
      selector({ token: null }),
    );
    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <App />
      </MemoryRouter>,
    );
    expect(screen.getByTestId("login-page")).toBeInTheDocument();
  });

  it("/login にアクセスするとログインページが表示される", () => {
    vi.mocked(useAuthStore).mockImplementation((selector: (s: { token: string | null }) => unknown) =>
      selector({ token: null }),
    );
    render(
      <MemoryRouter initialEntries={["/login"]}>
        <App />
      </MemoryRouter>,
    );
    expect(screen.getByTestId("login-page")).toBeInTheDocument();
  });

  it("認証済みの場合、/ から /dashboard にリダイレクトする", () => {
    vi.mocked(useAuthStore).mockImplementation((selector: (s: { token: string | null }) => unknown) =>
      selector({ token: "test-token" }),
    );
    render(
      <MemoryRouter initialEntries={["/"]}>
        <App />
      </MemoryRouter>,
    );
    expect(screen.getByTestId("dashboard-page")).toBeInTheDocument();
  });

  it("認証済みの場合、/projects ページが表示される", () => {
    vi.mocked(useAuthStore).mockImplementation((selector: (s: { token: string | null }) => unknown) =>
      selector({ token: "test-token" }),
    );
    render(
      <MemoryRouter initialEntries={["/projects"]}>
        <App />
      </MemoryRouter>,
    );
    expect(screen.getByTestId("projects-page")).toBeInTheDocument();
  });

  it("認証済みの場合、各ルートが正しくレンダリングされる", () => {
    vi.mocked(useAuthStore).mockImplementation((selector: (s: { token: string | null }) => unknown) =>
      selector({ token: "test-token" }),
    );
    const routes = [
      { path: "/reports", testId: "reports-page" },
      { path: "/safety", testId: "safety-page" },
      { path: "/itsm", testId: "itsm-page" },
      { path: "/knowledge", testId: "knowledge-page" },
      { path: "/cost", testId: "cost-page" },
      { path: "/photos", testId: "photos-page" },
      { path: "/users", testId: "users-page" },
    ];

    for (const { path, testId } of routes) {
      const { unmount } = render(
        <MemoryRouter initialEntries={[path]}>
          <App />
        </MemoryRouter>,
      );
      expect(screen.getByTestId(testId)).toBeInTheDocument();
      unmount();
    }
  });
});
