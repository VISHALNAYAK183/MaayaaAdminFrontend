/**
 * Pagination footer for server-paged tables.
 *
 * Drop this beneath any table whose data comes from a Spring Page response.
 * Pages are zero-indexed in props (matches Spring Data Page.number); the
 * label shown to the user is 1-indexed because nobody reads "page 0".
 *
 * Renders nothing when totalPages is 0 or 1 — small lists don't deserve a
 * page bar.
 */
interface PaginationProps {
  page: number;
  totalPages: number;
  onChange: (next: number) => void;
  className?: string;
}

export default function Pagination({ page, totalPages, onChange, className }: PaginationProps) {
  if (totalPages <= 1) return null;

  const prevDisabled = page <= 0;
  const nextDisabled = page >= totalPages - 1;

  return (
    <div
      className={
        "px-5 py-3 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between " +
        (className ?? "")
      }
    >
      <p className="text-xs text-gray-400">
        Page {page + 1} of {totalPages}
      </p>
      <div className="flex gap-1.5">
        <button
          onClick={() => onChange(Math.max(0, page - 1))}
          disabled={prevDisabled}
          className="text-xs px-3 py-1.5 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors font-medium text-gray-600 dark:text-gray-300"
        >
          ← Prev
        </button>
        <button
          onClick={() => onChange(Math.min(totalPages - 1, page + 1))}
          disabled={nextDisabled}
          className="text-xs px-3 py-1.5 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors font-medium text-gray-600 dark:text-gray-300"
        >
          Next →
        </button>
      </div>
    </div>
  );
}
