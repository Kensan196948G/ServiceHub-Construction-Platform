/**
 * SSE (Server-Sent Events) hook for real-time notifications (Phase 4a)
 *
 * EventSource does not support custom headers, so the JWT token is passed
 * as a query parameter. The backend validates it the same way as Authorization header.
 */
import { useEffect, useRef, useState } from "react";
import { useAuthStore } from "@/stores/authStore";

export interface SSENotification {
  type: string;
  id: string;
  title: string;
  message: string;
  project_id?: string;
  created_at?: string;
}

interface UseSSEOptions {
  /** Called when a new notification arrives */
  onNotification?: (notification: SSENotification) => void;
  /** Auto-reconnect delay in ms (default 3000) */
  reconnectDelay?: number;
}

interface UseSSEReturn {
  /** Unread notification count */
  unreadCount: number;
  /** Clear / reset the unread counter */
  clearUnread: () => void;
  /** Latest received notifications (up to 50) */
  notifications: SSENotification[];
  /** Whether the SSE connection is open */
  connected: boolean;
}

const BASE_URL = "/api/v1";
const MAX_BUFFERED = 50;

export function useSSE(options: UseSSEOptions = {}): UseSSEReturn {
  const { onNotification, reconnectDelay = 3000 } = options;
  const token = useAuthStore((s) => s.token);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<SSENotification[]>([]);
  const [connected, setConnected] = useState(false);
  const esRef = useRef<EventSource | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearUnread = () => setUnreadCount(0);

  useEffect(() => {
    if (!token) return;

    let cancelled = false;

    const connect = () => {
      if (cancelled) return;
      const url = `${BASE_URL}/notifications/stream?token=${encodeURIComponent(token)}`;
      const es = new EventSource(url);
      esRef.current = es;

      es.onopen = () => {
        if (!cancelled) setConnected(true);
      };

      es.onmessage = (ev) => {
        if (cancelled) return;
        try {
          const notification = JSON.parse(ev.data) as SSENotification;
          setNotifications((prev) => [notification, ...prev].slice(0, MAX_BUFFERED));
          setUnreadCount((n) => n + 1);
          onNotification?.(notification);
        } catch {
          // ignore malformed events
        }
      };

      es.onerror = () => {
        es.close();
        setConnected(false);
        if (!cancelled) {
          reconnectTimer.current = setTimeout(connect, reconnectDelay);
        }
      };
    };

    connect();

    return () => {
      cancelled = true;
      esRef.current?.close();
      esRef.current = null;
      if (reconnectTimer.current) {
        clearTimeout(reconnectTimer.current);
      }
      setConnected(false);
    };
  }, [token, reconnectDelay, onNotification]);

  return { unreadCount, clearUnread, notifications, connected };
}
