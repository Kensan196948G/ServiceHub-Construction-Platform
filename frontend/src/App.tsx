import { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Layout from "@/components/layout/Layout";
import { useAuthStore } from "@/stores/authStore";

const LoginPage = lazy(() => import("@/pages/auth/LoginPage"));
const DashboardPage = lazy(() => import("@/pages/DashboardPage"));
const ProjectsPage = lazy(() => import("@/pages/projects/ProjectsPage"));
const ProjectDetailPage = lazy(() => import("@/pages/projects/ProjectDetailPage"));
const DailyReportsPage = lazy(() => import("@/pages/reports/DailyReportsPage"));
const SafetyPage = lazy(() => import("@/pages/safety/SafetyPage"));
const ItsmPage = lazy(() => import("@/pages/itsm/ItsmPage"));
const KnowledgePage = lazy(() => import("@/pages/knowledge/KnowledgePage"));
const CostPage = lazy(() => import("@/pages/cost/CostPage"));
const PhotosPage = lazy(() => import("@/pages/photos/PhotosPage"));
const UsersPage = lazy(() => import("@/pages/users/UsersPage"));
const SettingsPage = lazy(() => import("@/pages/settings/SettingsPage"));
const NotificationDeliveriesPage = lazy(
  () => import("@/pages/notifications/NotificationDeliveriesPage"),
);
const PortalPage = lazy(() => import("@/pages/internal/PortalPage"));
const NoticesPage = lazy(() => import("@/pages/internal/NoticesPage"));
const HRPage = lazy(() => import("@/pages/internal/HRPage"));
const RulesPage = lazy(() => import("@/pages/internal/RulesPage"));

function PageFallback() {
  return (
    <div className="flex items-center justify-center min-h-[200px]" aria-label="読み込み中">
      <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.token);
  return token ? <>{children}</> : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <Suspense fallback={<PageFallback />}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/"
          element={
            <PrivateRoute>
              <Layout />
            </PrivateRoute>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="projects" element={<ProjectsPage />} />
          <Route path="projects/:id" element={<ProjectDetailPage />} />
          <Route path="reports" element={<DailyReportsPage />} />
          <Route path="safety" element={<SafetyPage />} />
          <Route path="itsm" element={<ItsmPage />} />
          <Route path="knowledge" element={<KnowledgePage />} />
          <Route path="cost" element={<CostPage />} />
          <Route path="photos" element={<PhotosPage />} />
          <Route path="users" element={<UsersPage />} />
          <Route
            path="admin/notifications"
            element={<NotificationDeliveriesPage />}
          />
          <Route path="portal" element={<PortalPage />} />
          <Route path="notices" element={<NoticesPage />} />
          <Route path="hr" element={<HRPage />} />
          <Route path="rules" element={<RulesPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
