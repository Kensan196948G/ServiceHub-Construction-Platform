import { useState } from "react";
import { FileText, History, Search } from "lucide-react";
import { ruleCategories, ruleRevisions } from "./_fixtures";

export default function RulesPage() {
  const [query, setQuery] = useState("");
  const filteredCategories = ruleCategories.filter((c) =>
    query.trim() === "" ? true : c.label.includes(query.trim()) || c.desc.includes(query.trim()),
  );

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">社内規程</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            就業規則・給与・安全衛生などの社内規程と改訂履歴を確認できます。
          </p>
        </div>
        <label className="relative flex w-full items-center sm:w-72">
          <Search className="pointer-events-none absolute left-3 h-4 w-4 text-gray-400" aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="規程カテゴリを検索"
            className="w-full rounded-md border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm text-gray-900 placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
          />
        </label>
      </header>

      <section aria-label="規程カテゴリ" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filteredCategories.length === 0 ? (
          <p className="col-span-full rounded-lg border border-dashed border-gray-300 py-8 text-center text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
            条件に一致する規程カテゴリはありません
          </p>
        ) : (
          filteredCategories.map(({ icon: Icon, label, count, desc }) => (
            <button
              key={label}
              type="button"
              className="group flex items-start gap-3 rounded-xl border border-gray-200 bg-white p-5 text-left shadow-sm transition-colors hover:border-primary-300 hover:bg-primary-50/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 dark:border-gray-700 dark:bg-gray-900 dark:hover:border-primary-600 dark:hover:bg-primary-900/20"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-600 dark:bg-primary-900/40 dark:text-primary-300">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">{label}</span>
                  <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600 tabular-nums dark:bg-gray-800 dark:text-gray-300">
                    {count} 条
                  </span>
                </span>
                <span className="mt-1 block text-xs text-gray-500 dark:text-gray-400">{desc}</span>
              </span>
            </button>
          ))
        )}
      </section>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900 lg:col-span-3">
          <header className="mb-4 flex items-center gap-2">
            <History className="h-5 w-5 text-primary-600 dark:text-primary-400" aria-hidden="true" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">最近の改訂</h2>
          </header>
          <ul className="divide-y divide-gray-200 dark:divide-gray-700">
            {ruleRevisions.map((r) => (
              <li
                key={`${r.title}-${r.ver}`}
                className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-gray-900 dark:text-white">{r.title}</p>
                  <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{r.diff}</p>
                </div>
                <div className="flex shrink-0 items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                  <span className="rounded-full bg-primary-50 px-2 py-0.5 font-medium text-primary-700 dark:bg-primary-900/40 dark:text-primary-200">
                    {r.ver}
                  </span>
                  <time className="tabular-nums">{r.date}</time>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <aside className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900 lg:col-span-2">
          <header className="mb-3 flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary-600 dark:text-primary-400" aria-hidden="true" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">様式・申請書</h2>
          </header>
          <ul className="space-y-2 text-sm">
            {[
              "有給休暇申請書",
              "出張申請書",
              "テレワーク申請書",
              "慶弔見舞金申請書",
              "社員通勤経路変更届",
            ].map((label) => (
              <li key={label}>
                <button
                  type="button"
                  className="flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-gray-800 transition-colors hover:bg-primary-50 hover:text-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 dark:text-gray-200 dark:hover:bg-primary-900/20 dark:hover:text-primary-200"
                >
                  <span>{label}</span>
                  <span className="text-xs text-gray-400">PDF</span>
                </button>
              </li>
            ))}
          </ul>
        </aside>
      </section>
    </div>
  );
}
