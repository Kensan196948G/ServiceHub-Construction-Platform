import { useEffect, useRef, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { Search, ChevronRight, Building2, AlertCircle } from "lucide-react";

type NavItem = { type: "nav"; label: string; target: string; kw: string };
type ProjectItem = { type: "project"; label: string; sub: string; target: string; kw: string };
type IncidentItem = { type: "incident"; label: string; sub: string; target: string; kw: string };
type Item = NavItem | ProjectItem | IncidentItem;

const BASE_ITEMS: Item[] = [
  { type: "nav", label: "ダッシュボード",   target: "/dashboard",  kw: "dashboard ホーム 概要" },
  { type: "nav", label: "工事案件一覧",     target: "/projects",   kw: "案件 プロジェクト 工事" },
  { type: "nav", label: "日報",             target: "/reports",    kw: "日報 daily" },
  { type: "nav", label: "写真管理",         target: "/photos",     kw: "写真 フォト" },
  { type: "nav", label: "安全品質",         target: "/safety",     kw: "安全 KY 危険予知 品質" },
  { type: "nav", label: "原価管理",         target: "/cost",       kw: "原価 コスト 予実" },
  { type: "nav", label: "ITSM",            target: "/itsm",       kw: "インシデント 変更 ITSM" },
  { type: "nav", label: "ナレッジ",         target: "/knowledge",  kw: "ナレッジ wiki" },
  { type: "nav", label: "社内ポータル",     target: "/portal",     kw: "ポータル 社内" },
  { type: "nav", label: "お知らせ",         target: "/notices",    kw: "お知らせ 掲示板" },
  { type: "nav", label: "人事・勤怠",       target: "/hr",         kw: "人事 勤怠 HR" },
  { type: "nav", label: "社内規程",         target: "/rules",      kw: "規程 手続き" },
  { type: "nav", label: "設定",             target: "/settings",   kw: "設定 プロフィール" },
];

const TYPE_LABEL: Record<Item["type"], string> = {
  nav: "ページ",
  project: "案件",
  incident: "障害",
};

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
}

export function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const [q, setQ] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (open) {
      setQ("");
      setTimeout(() => inputRef.current?.focus(), 20);
    }
  }, [open]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        if (!open) return;
        onClose();
      }
      if (e.key === "Escape" && open) onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  const items = useMemo(() => {
    if (!q) return BASE_ITEMS.slice(0, 8);
    return BASE_ITEMS.filter((it) =>
      (it.kw + " " + it.label).toLowerCase().includes(q.toLowerCase())
    ).slice(0, 10);
  }, [q]);

  if (!open) return null;

  const handleSelect = (target: string) => {
    navigate(target);
    onClose();
  };

  const iconFor = (type: Item["type"]) => {
    if (type === "project") return <Building2 size={16} />;
    if (type === "incident") return <AlertCircle size={16} />;
    return <ChevronRight size={16} />;
  };

  const bgFor = (type: Item["type"]) => {
    if (type === "project") return { bg: "var(--ok-10)",   fg: "var(--ok-60)" };
    if (type === "incident") return { bg: "var(--warn-10)", fg: "var(--warn-60)" };
    return { bg: "var(--brand-10)", fg: "var(--brand-60)" };
  };

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="グローバル検索"
      data-testid="command-palette"
      className="fixed inset-0 z-[1000] flex items-start justify-center pt-[10vh]"
      style={{ background: "rgba(15,23,42,0.55)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full max-w-xl rounded-2xl overflow-hidden bg-white"
        style={{ boxShadow: "var(--e3)" }}
      >
        {/* Input */}
        <div className="flex items-center gap-3 px-5 py-3.5 border-b border-gray-200">
          <Search size={20} className="text-gray-500 flex-shrink-0" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="案件・日報・ナレッジ・コマンドを検索..."
            aria-label="グローバル検索"
            className="flex-1 border-0 outline-none bg-transparent text-base text-gray-900 placeholder:text-gray-400"
            onKeyDown={(e) => e.key === "Escape" && onClose()}
          />
          <kbd className="font-mono text-xs px-2 py-0.5 rounded bg-gray-100 border border-gray-200 text-gray-600">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-[420px] overflow-y-auto p-2">
          {items.length === 0 && (
            <div className="py-8 text-center text-gray-500 text-sm">結果なし</div>
          )}
          {items.map((it, i) => {
            const { bg, fg } = bgFor(it.type);
            return (
              <button
                key={i}
                onClick={() => handleSelect(it.target)}
                className="flex w-full items-center gap-3 px-3.5 py-3 rounded-lg text-left transition-colors hover:bg-[var(--brand-10)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-60)]"
              >
                <span
                  className="w-8 h-8 rounded flex items-center justify-center flex-shrink-0"
                  style={{ background: bg, color: fg }}
                >
                  {iconFor(it.type)}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm text-gray-900 truncate">{it.label}</div>
                  {"sub" in it && it.sub && (
                    <div className="text-xs text-gray-500 font-mono mt-0.5">{it.sub}</div>
                  )}
                </div>
                <span className="text-xs text-gray-400 uppercase tracking-wide">
                  {TYPE_LABEL[it.type]}
                </span>
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-4 px-5 py-2.5 border-t border-gray-200 text-xs text-gray-500">
          <span>
            <kbd className="font-mono px-1.5 py-0.5 bg-gray-100 rounded border border-gray-200">↵</kbd>
            {" "}で移動
          </span>
          <span>
            <kbd className="font-mono px-1.5 py-0.5 bg-gray-100 rounded border border-gray-200">⌘K</kbd>
            {" "}で開閉
          </span>
        </div>
      </div>
    </div>,
    document.body
  );
}
