import { Calendar, AlertTriangle, CheckCircle2, Clock, ChevronRight } from "lucide-react";
import { Card, Badge } from "@/components/ui";

const MILESTONES = [
  { name: "基礎工事完了",        date: "2026-05-15", project: "渋谷オフィスビル新築工事", done: true },
  { name: "鉄骨建方完了",        date: "2026-06-10", project: "渋谷オフィスビル新築工事", done: false },
  { name: "外装工事着工",        date: "2026-07-01", project: "横浜マンション改修工事",   done: false },
  { name: "設備配線完了",        date: "2026-07-20", project: "川崎倉庫増築工事",         done: false },
  { name: "竣工検査",            date: "2026-09-30", project: "渋谷オフィスビル新築工事", done: false },
];

const CRITICAL_PATHS = [
  { project: "渋谷オフィスビル新築工事", delay: 3,  reason: "鉄骨材料納期遅延" },
  { project: "川崎倉庫増築工事",         delay: 0,  reason: null },
  { project: "横浜マンション改修工事",   delay: 5,  reason: "天候不順による養生期間延長" },
];

const GANTT_WEEKS = ["4/28", "5/5", "5/12", "5/19", "5/26", "6/2", "6/9", "6/16"];

type GanttItem = {
  task: string;
  project: string;
  start: number;
  span: number;
  status: "on-track" | "delayed" | "done";
};

const GANTT_ITEMS: GanttItem[] = [
  { task: "基礎工事",   project: "渋谷",   start: 0, span: 3, status: "done" },
  { task: "鉄骨建方",   project: "渋谷",   start: 2, span: 4, status: "delayed" },
  { task: "外装工事",   project: "横浜",   start: 4, span: 3, status: "on-track" },
  { task: "設備配線",   project: "川崎",   start: 1, span: 3, status: "on-track" },
  { task: "内装仕上",   project: "渋谷",   start: 5, span: 3, status: "on-track" },
];

const STATUS_COLOR: Record<GanttItem["status"], string> = {
  "done":     "bg-[var(--ok-60)]",
  "on-track": "bg-[var(--brand-60)]",
  "delayed":  "bg-[var(--err-60)]",
};

export default function SchedulePage() {
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">
            工程・スケジュール
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            ガント表示 · マイルストーン管理 · クリティカルパス警告
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="flex items-center gap-4 p-5">
          <div className="w-11 h-11 rounded-lg bg-[var(--brand-10)] flex items-center justify-center flex-shrink-0">
            <Calendar className="w-5 h-5 text-[var(--brand-60)]" />
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">稼働中案件</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">3</p>
          </div>
        </Card>
        <Card className="flex items-center gap-4 p-5">
          <div className="w-11 h-11 rounded-lg bg-[var(--err-10)] flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-5 h-5 text-[var(--err-60)]" />
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">遅延案件</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">2</p>
          </div>
        </Card>
        <Card className="flex items-center gap-4 p-5">
          <div className="w-11 h-11 rounded-lg bg-[var(--ok-10)] flex items-center justify-center flex-shrink-0">
            <CheckCircle2 className="w-5 h-5 text-[var(--ok-60)]" />
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">今月完了タスク</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">7</p>
          </div>
        </Card>
      </div>

      {/* Gantt chart */}
      <Card>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">ガント表示（週次）</h2>
          <div className="flex gap-3 text-xs">
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-[var(--ok-60)] inline-block" />完了</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-[var(--brand-60)] inline-block" />順調</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-[var(--err-60)] inline-block" />遅延</span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead>
              <tr>
                <th className="text-left py-2 pr-3 font-medium text-gray-500 dark:text-gray-400 w-44">タスク / 現場</th>
                {GANTT_WEEKS.map((w) => (
                  <th key={w} className="text-center py-2 px-1 font-medium text-gray-500 dark:text-gray-400 min-w-[60px]">
                    {w}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
              {GANTT_ITEMS.map((item, i) => (
                <tr key={i}>
                  <td className="py-2.5 pr-3">
                    <p className="font-medium text-gray-900 dark:text-gray-100">{item.task}</p>
                    <p className="text-xs text-gray-400">{item.project}</p>
                  </td>
                  {GANTT_WEEKS.map((_, wi) => {
                    const inBar = wi >= item.start && wi < item.start + item.span;
                    const isFirst = wi === item.start;
                    const isLast = wi === item.start + item.span - 1;
                    return (
                      <td key={wi} className="px-0.5 py-2.5">
                        {inBar ? (
                          <div
                            className={`h-6 ${STATUS_COLOR[item.status]} opacity-90
                              ${isFirst ? "rounded-l-md" : ""}
                              ${isLast ? "rounded-r-md" : ""}
                            `}
                          />
                        ) : (
                          <div className="h-6" />
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Milestones + Critical path side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Milestones */}
        <Card>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">マイルストーン</h2>
          <div className="space-y-3">
            {MILESTONES.map((m, i) => (
              <div
                key={i}
                className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
              >
                {m.done ? (
                  <CheckCircle2 className="w-5 h-5 text-[var(--ok-60)] flex-shrink-0" />
                ) : (
                  <Clock className="w-5 h-5 text-[var(--brand-60)] flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-gray-900 dark:text-gray-100">{m.name}</p>
                  <p className="text-xs text-gray-400 truncate">{m.project}</p>
                </div>
                <div className="text-right">
                  <Badge variant={m.done ? "success" : "info"} size="sm">
                    {m.done ? "完了" : m.date}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Critical path warnings */}
        <Card>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            クリティカルパス警告
          </h2>
          <div className="space-y-3">
            {CRITICAL_PATHS.map((c, i) => (
              <div
                key={i}
                className={`p-4 rounded-lg border ${
                  c.delay > 0
                    ? "border-[var(--err-20)] bg-[var(--err-10)] dark:bg-red-900/10"
                    : "border-[var(--ok-20)] bg-[var(--ok-10)] dark:bg-green-900/10"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-sm text-gray-900 dark:text-gray-100">{c.project}</p>
                    {c.reason && (
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{c.reason}</p>
                    )}
                  </div>
                  {c.delay > 0 ? (
                    <Badge variant="danger" size="sm">+{c.delay}日遅延</Badge>
                  ) : (
                    <Badge variant="success" size="sm">正常</Badge>
                  )}
                </div>
                {c.delay > 0 && (
                  <button className="mt-3 text-xs font-medium text-[var(--err-60)] inline-flex items-center gap-1 hover:underline">
                    挽回計画を作成 <ChevronRight className="w-3 h-3" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
