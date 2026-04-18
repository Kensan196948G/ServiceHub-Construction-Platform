import { Routes, Route, Navigate } from "react-router-dom";
import Layout from "@/components/layout/Layout";
import LoginPage from "@/pages/auth/LoginPage";
import DashboardPage from "@/pages/DashboardPage";
import ProjectsPage from "@/pages/projects/ProjectsPage";
import ProjectDetailPage from "@/pages/projects/ProjectDetailPage";
import DailyReportsPage from "@/pages/reports/DailyReportsPage";
import SafetyPage from "@/pages/safety/SafetyPage";
import ItsmPage from "@/pages/itsm/ItsmPage";
import KnowledgePage from "@/pages/knowledge/KnowledgePage";
import CostPage from "@/pages/cost/CostPage";
import PhotosPage from "@/pages/photos/PhotosPage";
import UsersPage from "@/pages/users/UsersPage";
import SettingsPage from "@/pages/settings/SettingsPage";
import NotificationDeliveriesPage from "@/pages/notifications/NotificationDeliveriesPage";
import PortalPage from "@/pages/internal/PortalPage";
import NoticesPage from "@/pages/internal/NoticesPage";
import HRPage from "@/pages/internal/HRPage";
import RulesPage from "@/pages/internal/RulesPage";
import { useAuthStore } from "@/stores/authStore";

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.token);
  return token ? <>{children}</> : <Navigate to="/login" replace />;
}

export default function App() {
  return (
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
  );
}
