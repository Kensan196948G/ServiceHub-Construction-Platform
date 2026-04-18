import { Outlet, Link, useNavigate, useLocation } from "react-router-dom";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import {
  LayoutDashboard,
  Building2,
  FileText,
  HardHat,
  AlertCircle,
  BookOpen,
  DollarSign,
  Image,
  LogOut,
  Menu,
  Moon,
  Sun,
  X,
  Users,
  Settings,
  Bell,
} from "lucide-react";
import { useState } from "react";
import { useAuthStore } from "@/stores/authStore";
import { useTheme } from "@/contexts/ThemeContext";
import { useSSE } from "@/hooks/useSSE";
import { NotificationBadge } from "@/components/ui/NotificationBadge";
import clsx from "clsx";

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout } = useAuthStore();
  const { theme, toggleTheme } = useTheme();
  const { unreadCount, clearUnread, connected } = useSSE();
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { to: "/dashboard", icon: LayoutDashboard, label: "ダッシュボード" },
    { to: "/projects", icon: Building2, label: "工事案件" },
    { to: "/reports", icon: FileText, label: "日報" },
    { to: "/safety", icon: HardHat, label: "安全品質" },
    { to: "/cost", icon: DollarSign, label: "原価管理" },
    { to: "/photos", icon: Image, label: "写真管理" },
    { to: "/itsm", icon: AlertCircle, label: "ITSM" },
    { to: "/knowledge", icon: BookOpen, label: "ナレッジ" },
    ...(user?.role === "ADMIN"
      ? [
          { to: "/users", icon: Users, label: "ユーザー管理" },
          { to: "/admin/notifications", icon: Bell, label: "通知管理" },
        ]
      : []),
    { to: "/settings", icon: Settings, label: "設定" },
  ];

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const NavLink = ({
    to,
    icon: Icon,
    label,
  }: {
    to: string;
    icon: typeof LayoutDashboard;
    label: string;
  }) => {
    const active = location.pathname.startsWith(to);
    return (
      <Link
        to={to}
        onClick={() => setSidebarOpen(false)}
        className={clsx(
          "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white",
          active
            ? "bg-primary-700 text-white"
            : "text-primary-100 hover:bg-primary-700 hover:text-white",
        )}
        aria-current={active ? "page" : undefined}
      >
        <Icon className="w-5 h-5 flex-shrink-0" />
        <span>{label}</span>
      </Link>
    );
  };

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-950">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        aria-label="サイドバーナビゲーション"
        className={clsx(
          "fixed top-0 left-0 h-full w-64 bg-primary-900 dark:bg-gray-900 text-white z-30 flex flex-col transition-transform duration-200",
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        )}
      >
        <div className="flex items-center gap-2 px-4 h-16 border-b border-primary-700 dark:border-gray-700">
          <HardHat className="w-7 h-7 text-construction-orange" aria-hidden="true" />
          <div>
            <p className="text-sm font-bold leading-tight">ServiceHub</p>
            <p className="text-xs text-primary-300 dark:text-gray-400 leading-tight">工事管理</p>
          </div>
        </div>

        <nav id="sidebar-nav" aria-label="メインナビゲーション" className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink key={item.to} {...item} />
          ))}
        </nav>

        <div className="px-3 py-4 border-t border-primary-700 dark:border-gray-700">
          <div className="px-3 py-2 text-xs text-primary-300 dark:text-gray-400 truncate">
            {user?.full_name ?? user?.email}
            <span className="ml-1 text-primary-400 dark:text-gray-500">({user?.role})</span>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3 py-2 rounded-md text-sm text-primary-100 hover:bg-primary-700 dark:hover:bg-gray-700 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            <LogOut className="w-4 h-4" aria-hidden="true" />
            ログアウト
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-col flex-1 lg:ml-64 min-w-0">
        {/* Header */}
        <header className="h-16 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 flex items-center px-4 gap-4 flex-shrink-0">
          <button
            className="lg:hidden p-2 rounded-md text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label={sidebarOpen ? "メニューを閉じる" : "メニューを開く"}
            aria-expanded={sidebarOpen}
            aria-controls="sidebar-nav"
          >
            {sidebarOpen ? <X className="w-5 h-5" aria-hidden="true" /> : <Menu className="w-5 h-5" aria-hidden="true" />}
          </button>
          <h1 className="text-lg font-semibold text-gray-800 dark:text-gray-100 flex-1">
            ServiceHub 工事管理プラットフォーム
          </h1>
          {/* Notification badge */}
          <NotificationBadge
            count={unreadCount}
            connected={connected}
            onClick={clearUnread}
          />
          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            aria-label={theme === "dark" ? "ライトモードに切り替え" : "ダークモードに切り替え"}
            data-testid="theme-toggle"
            className="p-2 rounded-md text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 transition-colors"
          >
            {theme === "dark" ? (
              <Sun className="w-5 h-5" aria-hidden="true" />
            ) : (
              <Moon className="w-5 h-5" aria-hidden="true" />
            )}
          </button>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}
