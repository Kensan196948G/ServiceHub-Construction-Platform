import { ChevronRight } from "lucide-react";
import { hrKpis, hrMenus, applications } from "./_fixtures";

const kpiTone: Record<NonNullable<(typeof hrKpis)[number]["tone"]>, string> = {
  ok: "text-emerald-600 dark:text-emerald-400",
  warn: "text-amber-600 dark:text-amber-400",
  err: "text-red-600 dark:text-red-400",
};

const statusTone: Record<(typeof applications)[number]["tone"], string> = {
  ok: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  warn: "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  err: "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300",
};

export default function HRPage() {
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">人事・勤怠</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          勤怠・申請・給与・シフトなど人事関連の手続きを行えます。
        </p>
      </header>

      <section aria-label="人事 KPI" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {hrKpis.map((k) => (
          <div
            key={k.label}
            className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900"
          >
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
              {k.label}
            </p>
            <p
              className={
                "mt-2 text-2xl font-bold tabular-nums " +
                (k.tone ? kpiTone[k.tone] : "text-gray-900 dark:text-white")
              }
            >
              {k.value}
            </p>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{k.sub}</p>
          </div>
        ))}
      </section>

      <section
        aria-label="手続きメニュー"
        className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900"
      >
        <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">手続きメニュー</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {hrMenus.map(({ icon: Icon, label, desc }) => (
            <button
              key={label}
              type="button"
              className="flex items-start gap-3 rounded-lg border border-gray-200 p-4 text-left transition-colors hover:border-primary-300 hover:bg-primary-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 dark:border-gray-700 dark:hover:border-primary-600 dark:hover:bg-primary-900/20"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-600 dark:bg-primary-900/40 dark:text-primary-300">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-gray-900 dark:text-white">{label}</span>
                <span className="mt-0.5 block text-xs text-gray-500 dark:text-gray-400">{desc}</span>
              </span>
              <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-gray-400" aria-hidden="true" />
            </button>
          ))}
        </div>
      </section>

      <section
        aria-label="最近の申請"
        className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900"
      >
        <header className="flex items-center justify-between border-b border-gray-200 px-5 py-3 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">最近の申請</h2>
          <span className="text-xs text-gray-500 dark:text-gray-400">直近 4 件</span>
        </header>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm dark:divide-gray-700">
            <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500 dark:bg-gray-800 dark:text-gray-400">
              <tr>
                <th scope="col" className="px-4 py-2 text-left font-medium">種別</th>
                <th scope="col" className="px-4 py-2 text-left font-medium">期間</th>
                <th scope="col" className="px-4 py-2 text-left font-medium">申請日</th>
                <th scope="col" className="px-4 py-2 text-left font-medium">承認者</th>
                <th scope="col" className="px-4 py-2 text-left font-medium">状態</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {applications.map((a) => (
                <tr key={`${a.kind}-${a.appliedAt}`} className="hover:bg-gray-50 dark:hover:bg-gray-800/60">
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{a.kind}</td>
                  <td className="px-4 py-3 text-gray-700 tabular-nums dark:text-gray-300">{a.period}</td>
                  <td className="px-4 py-3 text-gray-500 tabular-nums dark:text-gray-400">{a.appliedAt}</td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{a.approver}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusTone[a.tone]}`}>
                      {a.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
