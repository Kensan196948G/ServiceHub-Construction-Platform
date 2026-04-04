import { cn } from "@/lib/cn";

interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export function Pagination({
  page,
  totalPages,
  onPageChange,
  className,
}: PaginationProps) {
  if (totalPages <= 1) return null;

  const pages = getPageNumbers(page, totalPages);

  return (
    <nav aria-label="ページネーション" className={cn("flex items-center justify-center gap-1", className)}>
      <button
        type="button"
        className="rounded-md px-3 py-1.5 text-sm text-gray-500 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
        aria-label="前のページ"
      >
        ‹
      </button>

      {pages.map((p, i) =>
        p === "..." ? (
          <span key={`ellipsis-${i}`} className="px-2 text-sm text-gray-400">
            …
          </span>
        ) : (
          <button
            key={p}
            type="button"
            className={cn(
              "min-w-[2rem] rounded-md px-2 py-1.5 text-sm font-medium transition-colors",
              p === page
                ? "bg-primary-600 text-white"
                : "text-gray-700 hover:bg-gray-100",
            )}
            onClick={() => onPageChange(p as number)}
            aria-current={p === page ? "page" : undefined}
          >
            {p}
          </button>
        ),
      )}

      <button
        type="button"
        className="rounded-md px-3 py-1.5 text-sm text-gray-500 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
        aria-label="次のページ"
      >
        ›
      </button>
    </nav>
  );
}

function getPageNumbers(current: number, total: number): (number | "...")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  const pages: (number | "...")[] = [1];

  if (current > 3) pages.push("...");

  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);

  for (let i = start; i <= end; i++) pages.push(i);

  if (current < total - 2) pages.push("...");

  pages.push(total);

  return pages;
}
