import { Bell } from "lucide-react";
import clsx from "clsx";

interface NotificationBadgeProps {
  count: number;
  onClick?: () => void;
  connected?: boolean;
}

export function NotificationBadge({ count, onClick, connected = true }: NotificationBadgeProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={count > 0 ? `未読通知 ${count} 件` : "通知"}
      data-testid="notification-badge"
      className={clsx(
        "relative p-2 rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500",
        connected
          ? "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
          : "text-gray-300 dark:text-gray-600 cursor-default",
      )}
    >
      <Bell className="w-5 h-5" aria-hidden="true" />
      {count > 0 && (
        <span
          data-testid="unread-count"
          className="absolute top-1 right-1 min-w-[16px] h-4 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center px-0.5 leading-none"
        >
          {count > 99 ? "99+" : count}
        </span>
      )}
    </button>
  );
}
