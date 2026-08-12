'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';

// One shared pagination footer for every data table, so the control looks identical
// across the admin, vendor and checker portals. Matches the app's dominant style:
// a card footer (top border) with icon Prev/Next chevrons and numbered pages
// (collapsing with … ellipses), brand-500 active page. Drop-in for the inline copies
// that were scattered across ~30 files.

export interface PaginationProps {
  /** 1-based current page. */
  page: number;
  /** Total number of pages. */
  totalPages: number;
  /** Called with the next 1-based page number. */
  onChange: (page: number) => void;
  /** Disables all controls (e.g. while a server page is loading). */
  disabled?: boolean;
  /** Extra classes on the footer container. */
  className?: string;
}

// Compact page list: 1 … (n-1) n (n+1) … total.
export function getPageRange(current: number, total: number): Array<number | '…'> {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: Array<number | '…'> = [1];
  if (current > 3) pages.push('…');
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  for (let p = start; p <= end; p++) pages.push(p);
  if (current < total - 2) pages.push('…');
  pages.push(total);
  return pages;
}

export default function Pagination({ page, totalPages, onChange, disabled, className = '' }: PaginationProps) {
  if (totalPages <= 1) return null;

  const navBtn =
    'p-2 text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors';

  return (
    <div className={`flex items-center justify-end gap-1.5 text-sm px-4 py-3 border-t border-slate-100 ${className}`}>
      <button
        type="button"
        onClick={() => onChange(Math.max(1, page - 1))}
        disabled={disabled || page <= 1}
        aria-label="Previous page"
        className={navBtn}
      >
        <ChevronLeft className="w-4 h-4" />
      </button>
      {getPageRange(page, totalPages).map((p, i) =>
        p === '…' ? (
          <span key={`ellipsis-${i}`} className="px-2 text-slate-400" aria-hidden="true">…</span>
        ) : (
          <button
            key={`page-${p}`}
            type="button"
            onClick={() => onChange(p as number)}
            disabled={disabled}
            aria-current={p === page ? 'page' : undefined}
            aria-label={`Go to page ${p}`}
            className={`min-w-9 h-9 px-2 rounded-lg text-sm font-medium transition-colors disabled:cursor-not-allowed ${
              p === page
                ? 'bg-brand-500 text-white shadow-xs shadow-brand-500/20'
                : 'text-slate-700 hover:bg-slate-100'
            }`}
          >
            {p}
          </button>
        )
      )}
      <button
        type="button"
        onClick={() => onChange(Math.min(totalPages, page + 1))}
        disabled={disabled || page >= totalPages}
        aria-label="Next page"
        className={navBtn}
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}
