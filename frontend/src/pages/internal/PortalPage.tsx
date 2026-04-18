import { Link } from "react-router-dom";
import { Bell, Calendar, ChevronRight, PartyPopper, Sparkles } from "lucide-react";
import {
  notices,
  events,
  quickLinks,
  birthdays,
  newHires,
} from "./_fixtures";

const categoryTone: Record<string, string> = {
  重要: "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300",
  人事: "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  ITSM: "bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  福利厚生: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  規程: "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  安全: "bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
};

const eventTone: Record<string, string> = {
  brand: "bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-200",
  safety: "bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-200",
  warn: "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-200",
  ok: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200",
};

export default function PortalPage() {
  const pinned = notices.filter((n) => n.pinned);
  const latest = notices.filter((n) => !n.pinned).slice(0, 4);

  return (
    <div className="space-y-6">
      <section className="rounded-2xl bg-gradient-to-r from-primary-700 to-primary-500 px-6 py-7 text-white shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">社内ポータル</h1>
            <p className="mt-2 text-sm text-primary-50/90">
              お知らせ・イベント・各種手続きをまとめて確認できます。
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded-full bg-white/20 px-3 py-1">本日 {new Date().toLocaleDateString("ja-JP")}</span>
            <span className="rounded-full bg-white/20 px-3 py-1">ServiceHub v1.0</span>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900 lg:col-span-2">
          <header className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white">
              <Bell className="h-5 w-5 text-primary-600 dark:text-primary-400" aria-hidden="true" />
              お知らせ
            </h2>
            <Link to="/notices" className="flex items-center gap-1 text-sm text-primary-600 hover:underline dark:text-primary-400">
              一覧を見る
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </header>

          <ul className="space-y-2">
            {pinned.map((n) => (
              <li
                key={n.id}
                className="flex items-start justify-between gap-3 rounded-lg bg-amber-50 px-3 py-2 dark:bg-amber-900/20"
              >
                <div className="min-w-0">
                  <span className={`mr-2 inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${categoryTone[n.cat]}`}>
                    {n.cat}
                  </span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">{n.title}</span>
                </div>
                <time className="shrink-0 text-xs text-gray-500 dark:text-gray-400">{n.date}</time>
              </li>
            ))}
            {latest.map((n) => (
              <li
                key={n.id}
                className="flex items-start justify-between gap-3 rounded-lg px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                <div className="min-w-0">
                  <span className={`mr-2 inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${categoryTone[n.cat]}`}>
                    {n.cat}
                  </span>
                  <span className="text-sm text-gray-800 dark:text-gray-200">{n.title}</span>
                </div>
                <time className="shrink-0 text-xs text-gray-500 dark:text-gray-400">{n.date}</time>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900">
          <header className="mb-4 flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary-600 dark:text-primary-400" aria-hidden="true" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">直近のイベント</h2>
          </header>
          <ul className="space-y-2">
            {events.map((e) => (
              <li key={`${e.date}-${e.title}`} className="flex items-center gap-3">
                <div className={`flex h-12 w-14 flex-col items-center justify-center rounded-lg ${eventTone[e.color]}`}>
                  <span className="text-sm font-bold tabular-nums">{e.date}</span>
                  <span className="text-[10px]">{e.day}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-gray-900 dark:text-white">{e.title}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{e.loc}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900">
        <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">クイックリンク</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
          {quickLinks.map(({ label, icon: Icon }) => (
            <button
              key={label}
              type="button"
              className="flex flex-col items-center gap-2 rounded-lg border border-gray-200 px-3 py-4 text-center transition-colors hover:border-primary-300 hover:bg-primary-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 dark:border-gray-700 dark:hover:border-primary-600 dark:hover:bg-primary-900/20"
            >
              <Icon className="h-6 w-6 text-primary-600 dark:text-primary-300" aria-hidden="true" />
              <span className="text-xs font-medium text-gray-700 dark:text-gray-200">{label}</span>
            </button>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900">
          <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white">
            <PartyPopper className="h-5 w-5 text-pink-500" aria-hidden="true" />
            今月のお誕生日
          </h2>
          <ul className="space-y-2">
            {birthdays.map((b) => (
              <li key={b.name} className="flex items-center justify-between rounded-md px-2 py-1.5 hover:bg-gray-50 dark:hover:bg-gray-800">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{b.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{b.dept}</p>
                </div>
                <span className="text-sm text-pink-600 tabular-nums dark:text-pink-300">{b.date}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900">
          <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white">
            <Sparkles className="h-5 w-5 text-emerald-500" aria-hidden="true" />
            新入社員のご紹介
          </h2>
          <ul className="space-y-2">
            {newHires.map((m) => (
              <li key={m.name} className="flex items-center justify-between rounded-md px-2 py-1.5 hover:bg-gray-50 dark:hover:bg-gray-800">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{m.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{m.dept}</p>
                </div>
                <span className="text-sm text-emerald-600 tabular-nums dark:text-emerald-300">{m.date}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
