import { useMemo, useState } from "react";
import { Pin, Search } from "lucide-react";
import { notices, type NoticeCategory } from "./_fixtures";

const categoryTone: Record<NoticeCategory, string> = {
  重要: "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300",
  人事: "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  ITSM: "bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  福利厚生: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  規程: "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  安全: "bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
};

const filters: ("すべて" | NoticeCategory)[] = [
  "すべて",
  "重要",
  "人事",
  "ITSM",
  "福利厚生",
  "規程",
  "安全",
];

export default function NoticesPage() {
  const [active, setActive] = useState<(typeof filters)[number]>("すべて");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    return notices.filter((n) => {
      const matchesCategory = active === "すべて" || n.cat === active;
      const matchesQuery = query.trim() === "" || n.title.includes(query.trim());
      return matchesCategory && matchesQuery;
    });
  }, [active, query]);

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">お知らせ</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          社内全体向けの通知・告知を閲覧できます。重要なお知らせはピン留めされます。
        </p>
      </header>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {filters.map((f) => {
            const selected = f === active;
            return (
              <button
                key={f}
                type="button"
                onClick={() => setActive(f)}
                className={
                  "rounded-full px-3.5 py-1.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 " +
                  (selected
                    ? "bg-primary-600 text-white dark:bg-primary-500"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700")
                }
                aria-pressed={selected}
              >
                {f}
              </button>
            );
          })}
        </div>

        <label className="relative flex w-full items-center sm:w-72">
          <Search className="pointer-events-none absolute left-3 h-4 w-4 text-gray-400" aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="タイトルで検索"
            className="w-full rounded-md border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm text-gray-900 placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
          />
        </label>
      </div>

      <ul className="divide-y divide-gray-200 rounded-xl border border-gray-200 bg-white dark:divide-gray-700 dark:border-gray-700 dark:bg-gray-900">
        {filtered.length === 0 ? (
          <li className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
            条件に一致するお知らせはありません
          </li>
        ) : (
          filtered.map((n) => (
            <li
              key={n.id}
              className={
                "flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:justify-between " +
                (n.pinned ? "bg-amber-50/60 dark:bg-amber-900/10" : "")
              }
            >
              <div className="flex min-w-0 items-start gap-3">
                {n.pinned ? (
                  <Pin className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" aria-label="ピン留め" />
                ) : (
                  <span className="h-4 w-4 shrink-0" aria-hidden="true" />
                )}
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-gray-900 dark:text-white">{n.title}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                    <span className={`inline-flex rounded-full px-2 py-0.5 font-medium ${categoryTone[n.cat]}`}>
                      {n.cat}
                    </span>
                    <span>{n.by}</span>
                    <time>{n.date}</time>
                  </div>
                </div>
              </div>
              {n.readCount ? (
                <span className="shrink-0 text-xs text-gray-500 tabular-nums dark:text-gray-400">
                  既読 {n.readCount[0]} / {n.readCount[1]}
                </span>
              ) : null}
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
