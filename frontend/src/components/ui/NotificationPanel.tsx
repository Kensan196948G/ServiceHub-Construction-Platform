/**
 * NotificationPanel — slide-over notification drawer (Phase 4b)
 *
 * Rendered inside Layout; opened by clicking the NotificationBadge.
 * Receives notifications from useSSE and allows clearing them.
 */
import { useEffect, useRef } from "react";
import { X, Bell, CheckCheck } from "lucide-react";
import type { SSENotification } from "@/hooks/useSSE";

interface NotificationPanelProps {
  open: boolean;
  notifications: SSENotification[];
  onClose: () => void;
  onClearAll: () => void;
}

function formatTime(ts: string | undefined): string {
  if (!ts) return "";
  try {
    return new Date(ts).toLocaleString("ja-JP", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

export function NotificationPanel({
  open,
  notifications,
  onClose,
  onClearAll,
}: NotificationPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on Escape key
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      {/* backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/30"
        aria-hidden="true"
        data-testid="notification-panel-backdrop"
      />

      {/* panel */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="通知パネル"
        data-testid="notification-panel"
        className="fixed right-0 top-0 z-50 flex h-full w-80 flex-col bg-white shadow-2xl dark:bg-gray-900"
      >
        {/* header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-gray-700">
          <span className="flex items-center gap-2 font-semibold text-gray-900 dark:text-white">
            <Bell className="h-4 w-4" aria-hidden="true" />
            通知
          </span>
          <div className="flex items-center gap-1">
            {notifications.length > 0 && (
              <button
                type="button"
                onClick={onClearAll}
                className="flex items-center gap-1 rounded px-2 py-1 text-xs text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
                aria-label="すべての通知をクリア"
                data-testid="notification-clear-all"
              >
                <CheckCheck className="h-3.5 w-3.5" aria-hidden="true" />
                すべてクリア
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="rounded p-1 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
              aria-label="通知パネルを閉じる"
              data-testid="notification-panel-close"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* notification list */}
        <ul
          className="flex-1 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800"
          role="list"
          aria-label="通知一覧"
          data-testid="notification-list"
        >
          {notifications.length === 0 ? (
            <li
              className="flex flex-col items-center justify-center gap-2 py-16 text-gray-400 dark:text-gray-500"
              data-testid="notification-empty"
            >
              <Bell className="h-8 w-8 opacity-30" aria-hidden="true" />
              <span className="text-sm">通知はありません</span>
            </li>
          ) : (
            notifications.map((n, idx) => (
              <li
                key={n.id ?? idx}
                className="px-4 py-3"
                data-testid="notification-item"
              >
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {n.title}
                </p>
                {n.message && (
                  <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                    {n.message}
                  </p>
                )}
                {n.created_at && (
                  <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                    {formatTime(n.created_at)}
                  </p>
                )}
              </li>
            ))
          )}
        </ul>
      </div>
    </>
  );
}
