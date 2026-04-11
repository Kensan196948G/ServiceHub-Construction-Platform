import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Bell, RefreshCw } from "lucide-react";
import {
  notificationDeliveriesApi,
  NotificationDelivery,
} from "@/api/notificationDeliveries";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { Pagination } from "@/components/ui/Pagination";

const STATUS_VARIANT: Record<
  NotificationDelivery["status"],
  "default" | "success" | "warning" | "danger" | "info"
> = {
  PENDING: "warning",
  SENT: "success",
  FAILED: "danger",
};

const CHANNEL_VARIANT: Record<
  NotificationDelivery["channel"],
  "default" | "success" | "warning" | "danger" | "info"
> = {
  EMAIL: "info",
  SLACK: "default",
};

export default function NotificationDeliveriesPage() {
  const [page, setPage] = useState(1);
  const queryClient = useQueryClient();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["notification-deliveries", page],
    queryFn: () => notificationDeliveriesApi.list({ page, per_page: 20 }),
  });

  const retryMutation = useMutation({
    mutationFn: () => notificationDeliveriesApi.retry(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notification-deliveries"] });
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="h-6 w-6 text-gray-600" />
          <h1 className="text-2xl font-bold text-gray-900">通知配信履歴</h1>
        </div>
        <Button
          onClick={() => retryMutation.mutate()}
          disabled={retryMutation.isPending}
          data-testid="retry-button"
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          {retryMutation.isPending ? "処理中…" : "transient 失敗を再送信"}
        </Button>
      </div>

      {retryMutation.isSuccess && (
        <div
          role="alert"
          className="rounded-md bg-green-50 p-3 text-sm text-green-800"
          data-testid="retry-result"
        >
          {retryMutation.data?.message}
        </div>
      )}

      {retryMutation.isError && (
        <div
          role="alert"
          className="rounded-md bg-red-50 p-3 text-sm text-red-800"
          data-testid="retry-error"
        >
          再送信に失敗しました。
        </div>
      )}

      <Card>
        {isLoading && (
          <div className="space-y-3 p-4" data-testid="deliveries-skeleton">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        )}

        {isError && (
          <div
            role="alert"
            className="p-4 text-sm text-red-600"
            data-testid="deliveries-error"
          >
            配信履歴の取得に失敗しました。
          </div>
        )}

        {!isLoading && !isError && (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm" data-testid="deliveries-table">
                <thead className="border-b bg-gray-50 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  <tr>
                    <th className="px-4 py-3">チャンネル</th>
                    <th className="px-4 py-3">イベント</th>
                    <th className="px-4 py-3">ステータス</th>
                    <th className="px-4 py-3">失敗種別</th>
                    <th className="px-4 py-3">試行回数</th>
                    <th className="px-4 py-3">件名</th>
                    <th className="px-4 py-3">作成日時</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {data?.data.length === 0 && (
                    <tr>
                      <td
                        colSpan={7}
                        className="py-8 text-center text-gray-500"
                        data-testid="deliveries-empty"
                      >
                        配信履歴がありません。
                      </td>
                    </tr>
                  )}
                  {data?.data.map((d) => (
                    <tr
                      key={d.id}
                      className="hover:bg-gray-50"
                      data-testid="delivery-row"
                    >
                      <td className="px-4 py-3">
                        <Badge variant={CHANNEL_VARIANT[d.channel]}>
                          {d.channel}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">
                        {d.event_key}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={STATUS_VARIANT[d.status]}>
                          {d.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-gray-500">
                        {d.failure_kind ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-center">{d.attempts}</td>
                      <td className="px-4 py-3 max-w-xs truncate">
                        {d.subject ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">
                        {new Date(d.created_at).toLocaleString("ja-JP")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {data && data.meta.pages > 1 && (
              <div className="border-t px-4 py-3">
                <Pagination
                  page={data.meta.page}
                  totalPages={data.meta.pages}
                  onPageChange={setPage}
                />
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
}
