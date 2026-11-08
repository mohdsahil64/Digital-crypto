import { ChevronLeft, ChevronRight } from "lucide-react";

/**
 * Simple Next/Back pager. Shows nothing when there's a single page or less.
 *
 * Props:
 *  - page: current 0-based page index
 *  - pageSize: items per page
 *  - total: total item count
 *  - onChange: (newPage) => void
 */
export default function Pagination({ page, pageSize, total, onChange }) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  if (pageCount <= 1) return null;

  const from = total === 0 ? 0 : page * pageSize + 1;
  const to = Math.min(total, (page + 1) * pageSize);
  const canPrev = page > 0;
  const canNext = page < pageCount - 1;

  return (
    <div className="mt-4 flex items-center justify-between gap-3">
      <p className="text-[11px] text-slate-500">
        {from}–{to} of {total}
      </p>
      <div className="flex items-center gap-2">
        <button
          onClick={() => canPrev && onChange(page - 1)}
          disabled={!canPrev}
          className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs font-medium text-slate-200 transition hover:bg-white/10 disabled:opacity-40"
        >
          <ChevronLeft className="h-3.5 w-3.5" /> Back
        </button>
        <span className="text-[11px] text-slate-400">
          {page + 1} / {pageCount}
        </span>
        <button
          onClick={() => canNext && onChange(page + 1)}
          disabled={!canNext}
          className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs font-medium text-slate-200 transition hover:bg-white/10 disabled:opacity-40"
        >
          Next <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
