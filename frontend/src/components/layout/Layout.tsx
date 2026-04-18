import { Outlet, Link, useNavigate, useLocation } from "react-router-dom";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { CommandPalette } from "@/components/ui/CommandPalette";
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
  Home,
  Newspaper,
  UserCog,
  BookText,
  Search,
  Wifi,
  WifiOff,
  ChevronRight,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useAuthStore } from "@/stores/authStore";
import { useTheme } from "@/contexts/ThemeContext";
import { useSSE } from "@/hooks/useSSE";
import { NotificationBadge } from "@/components/ui/NotificationBadge";
import { NotificationPanel } from "@/components/ui/NotificationPanel";
import clsx from "clsx";

type NavItem = {
  to: string;
  icon: typeof LayoutDashboard;
  label: string;
};

type NavGroup = {
  label: string;
  items: NavItem[];
};

const ROUTE_LABELS: Record<string, string> = {
  "/dashboard":           "ダッシュボード",
  "/projects":            "工事案件",
  "/reports":             "日報",
  "/photos":              "写真管理",
  "/safety":              "安全品質",
  "/cost":                "原価管理",
  "/itsm":                "ITSM",
  "/knowledge":           "ナレッジ",
  "/portal":              "社内ポータル",
  "/notices":             "お知らせ",
  "/hr":                  "人事・勤怠",
  "/rules":               "社内規程",
  "/users":               "ユーザー管理",
  "/admin/notifications": "通知管理",
  "/settings":            "設定",
};

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const { user, logout } = useAuthStore();
  const { theme, toggleTheme } = useTheme();
  const { unreadCount, clearUnread, clearNotifications, notifications, connected } = useSSE();
  const navigate = useNavigate();
  const location = useLocation();

  const handleBadgeClick = () => {
    setPanelOpen((prev) => !prev);
    clearUnread();
  };

  // Cmd+K global shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setPaletteOpen((prev) => !prev);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  // Breadcrumb derived from pathname
  const breadcrumb = (() => {
    const base = "ServiceHub";
    const matched = Object.entries(ROUTE_LABELS).find(([path]) =>
      location.pathname.startsWith(path)
    );
    return matched ? [base, matched[1]] : [base];
  })();

  const navGroups: NavGroup[] = [
    {
      label: "業務",
      items: [
        { to: "/dashboard", icon: LayoutDashboard, label: "ダッシュボード" },
        { to: "/projects",  icon: Building2,        label: "工事案件" },
        { to: "/reports",   icon: FileText,         label: "日報" },
        { to: "/photos",    icon: Image,            label: "写真管理" },
      ],
    },
    {
      label: "運用",
      items: [
        { to: "/safety",    icon: HardHat,      label: "安全品質" },
        { to: "/cost",      icon: DollarSign,   label: "原価管理" },
        { to: "/itsm",      icon: AlertCircle,  label: "ITSM" },
        { to: "/knowledge", icon: BookOpen,     label: "ナレッジ" },
      ],
    },
    {
      label: "社内",
      items: [
        { to: "/portal",  icon: Home,      label: "社内ポータル" },
        { to: "/notices", icon: Newspaper, label: "お知らせ" },
        { to: "/hr",      icon: UserCog,   label: "人事・勤怠" },
        { to: "/rules",   icon: BookText,  label: "社内規程" },
      ],
    },
    {
      label: "管理",
      items: [
        ...(user?.role === "ADMIN"
          ? [
              { to: "/users",               icon: Users, label: "ユーザー管理" },
              { to: "/admin/notifications", icon: Bell,  label: "通知管理" },
            ]
          : []),
        { to: "/settings", icon: Settings, label: "設定" },
      ],
    },
  ];

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const NavLink = ({ to, icon: Icon, label }: NavItem) => {
    const active = location.pathname.startsWith(to);
    return (
      <Link
        to={to}
        onClick={() => setSidebarOpen(false)}
        className={clsx(
          "flex items-center gap-3 px-3 rounded-lg text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-60)]",
          "min-h-[44px]",
          active
            ? "bg-[var(--brand-10)] text-[var(--brand-70)] font-semibold shadow-[inset_3px_0_0_var(--brand-60)]"
            : "text-gray-700 hover:bg-gray-100 hover:text-gray-900",
        )}
        aria-current={active ? "page" : undefined}
      >
        <Icon className="w-[18px] h-[18px] flex-shrink-0" />
        <span>{label}</span>
      </Link>
    );
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Notification panel */}
      <NotificationPanel
        open={panelOpen}
        notifications={notifications}
        onClose={() => setPanelOpen(false)}
        onClearAll={() => { clearNotifications(); setPanelOpen(false); }}
      />

      {/* Command Palette */}
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar — canonical white bg */}
      <aside
        aria-label="サイドバーナビゲーション"
        className={clsx(
          "fixed top-0 left-0 h-full w-64 bg-white border-r border-gray-200 z-30 flex flex-col transition-transform duration-200",
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        )}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 h-16 border-b border-gray-200">
          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-gradient-to-br from-[var(--brand-50)] to-[#f97316] flex-shrink-0">
            <HardHat className="w-5 h-5 text-white" aria-hidden="true" />
          </div>
          <div>
            <p className="text-sm font-bold leading-tight text-gray-900">ServiceHub</p>
            <p className="text-xs text-gray-500 leading-tight">工事管理</p>
          </div>
        </div>

        <nav id="sidebar-nav" aria-label="メインナビゲーション" className="flex-1 px-3 py-4 overflow-y-auto">
          {navGroups.map((group, gi) => (
            <div key={group.label} className={gi > 0 ? "mt-6" : ""}>
              <div className="px-3 mb-2 text-xs font-semibold uppercase tracking-widest text-gray-400"
                   style={{ letterSpacing: "0.14em" }}>
                {group.label}
              </div>
              <div className="space-y-0.5">
                {group.items.map((item) => (
                  <NavLink key={item.to} {...item} />
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* User area */}
        <div className="px-4 py-4 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[var(--brand-60)] text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
              {(user?.full_name ?? user?.email ?? "?").slice(0, 2)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-gray-900 truncate">
                {user?.full_name ?? user?.email}
              </div>
              <div className="text-xs text-gray-500">{user?.role}</div>
            </div>
            <button
              onClick={handleLogout}
              aria-label="ログアウト"
              className="w-[44px] h-[44px] flex items-center justify-center rounded-lg text-gray-500 hover:bg-white hover:text-gray-900 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-60)]"
            >
              <LogOut className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-col flex-1 lg:ml-64 min-w-0">
        {/* TopBar */}
        <header className="sticky top-0 z-10 h-16 border-b border-gray-200 flex items-center px-8 gap-5 flex-shrink-0"
                style={{ background: "rgba(255,255,255,0.92)", backdropFilter: "blur(10px)" }}>
          {/* Mobile menu toggle */}
          <button
            className="lg:hidden p-2 rounded-md text-gray-500 hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-60)]"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label={sidebarOpen ? "メニューを閉じる" : "メニューを開く"}
            aria-expanded={sidebarOpen}
            aria-controls="sidebar-nav"
          >
            {sidebarOpen ? <X className="w-5 h-5" aria-hidden="true" /> : <Menu className="w-5 h-5" aria-hidden="true" />}
          </button>

          {/* Breadcrumb */}
          <nav aria-label="パンくずリスト" className="flex-1 min-w-0">
            <ol className="flex items-center gap-2 text-sm">
              {breadcrumb.map((b, i) => (
                <li key={i} className="flex items-center gap-2">
                  <span className={clsx(
                    i === breadcrumb.length - 1
                      ? "font-semibold text-gray-900"
                      : "text-gray-500 font-normal",
                  )}
                  {...(i === breadcrumb.length - 1 ? { "aria-current": "page" } : {})}>
                    {b}
                  </span>
                  {i < breadcrumb.length - 1 && (
                    <ChevronRight className="w-3.5 h-3.5 text-gray-400" aria-hidden="true" />
                  )}
                </li>
              ))}
            </ol>
          </nav>

          {/* Cmd+K search trigger */}
          <button
            onClick={() => setPaletteOpen(true)}
            aria-label="グローバル検索を開く (⌘K)"
            data-testid="search-trigger"
            className="hidden sm:flex items-center gap-2.5 h-10 px-3.5 bg-gray-100 border border-gray-200 rounded-lg text-gray-600 text-sm min-w-[200px] hover:bg-gray-200 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-60)]"
          >
            <Search className="w-4 h-4 flex-shrink-0" />
            <span className="flex-1 text-left">横断検索 ...</span>
            <kbd className="font-mono text-xs px-1.5 py-0.5 bg-white rounded border border-gray-200 text-gray-500">⌘K</kbd>
          </button>

          {/* Online indicator */}
          <div
            aria-live="polite"
            aria-label={connected ? "接続状態：オンライン" : "接続状態：オフライン"}
            className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold"
            style={{
              background: connected ? "var(--ok-10)" : "var(--warn-10)",
              color:      connected ? "var(--ok-60)" : "var(--warn-60)",
            }}
          >
            {connected
              ? <Wifi className="w-3.5 h-3.5" aria-hidden="true" />
              : <WifiOff className="w-3.5 h-3.5" aria-hidden="true" />}
            {connected ? "オンライン" : "オフライン"}
          </div>

          {/* Notification badge */}
          <NotificationBadge
            count={unreadCount}
            connected={connected}
            onClick={handleBadgeClick}
          />

          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            aria-label={theme === "dark" ? "ライトモードに切り替え" : "ダークモードに切り替え"}
            data-testid="theme-toggle"
            className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-60)] transition-colors"
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

