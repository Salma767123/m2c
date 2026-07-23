'use client';

import { ArrowRight, Check, X, Clock, RotateCcw, Ban } from 'lucide-react';
import type { NegotiationRound, NegotiationRoundStatus } from '@/services/priceNegotiationService';
import { reasonLabel } from '@/services/priceNegotiationService';

/**
 * Read-only negotiation history, shared by the admin and vendor views so both
 * sides always see the same record of who offered what, why and when.
 */

const STATUS_META: Record<
  NegotiationRoundStatus,
  { label: string; cls: string; Icon: typeof Check }
> = {
  PENDING: { label: 'Awaiting response', cls: 'bg-amber-50 text-amber-700 ring-amber-200', Icon: Clock },
  ACCEPTED: { label: 'Accepted', cls: 'bg-green-50 text-green-700 ring-green-200', Icon: Check },
  REJECTED: { label: 'Rejected', cls: 'bg-red-50 text-red-700 ring-red-200', Icon: X },
  COUNTERED: { label: 'Countered', cls: 'bg-slate-100 text-slate-600 ring-slate-200', Icon: RotateCcw },
  EXPIRED: { label: 'Expired', cls: 'bg-slate-100 text-slate-500 ring-slate-200', Icon: Clock },
  CANCELLED: { label: 'Cancelled', cls: 'bg-slate-100 text-slate-500 ring-slate-200', Icon: Ban },
};

const money = (n?: number | null) =>
  n == null ? '—' : `₹${Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const when = (iso: string) =>
  new Date(iso).toLocaleString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });

export default function NegotiationTimeline({
  rounds,
  originalPrice,
  agreedPrice,
  emptyHint = 'No price negotiation has been raised for this product.',
}: {
  rounds: NegotiationRound[];
  /** The vendor's first asking price, shown as the starting point. */
  originalPrice?: number | null;
  agreedPrice?: number | null;
  emptyHint?: string;
}) {
  if (!rounds.length) {
    return (
      <div className="text-center py-8 text-slate-500 text-sm">
        {emptyHint}
      </div>
    );
  }

  return (
    <div className="space-y-0">
      {/* Starting point — the vendor's original ask */}
      {originalPrice != null && (
        <div className="relative pl-8 pb-6">
          <span className="absolute left-0 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 ring-1 ring-slate-200 text-[10px] font-bold text-slate-500">
            0
          </span>
          <span className="absolute left-3 top-7 bottom-0 w-px bg-slate-200" aria-hidden />
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Vendor asking price</p>
          <p className="text-lg font-bold text-slate-900">{money(originalPrice)}</p>
        </div>
      )}

      {rounds.map((r, i) => {
        const meta = STATUS_META[r.status] ?? STATUS_META.PENDING;
        const isAdmin = r.proposedBy === 'ADMIN';
        const last = i === rounds.length - 1;
        return (
          <div key={r.id} className="relative pl-8 pb-6 last:pb-0">
            <span
              className={`absolute left-0 top-1 flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold ring-1 ${
                isAdmin ? 'bg-brand-50 text-brand-600 ring-brand-200' : 'bg-blue-50 text-blue-600 ring-blue-200'
              }`}
            >
              {r.round}
            </span>
            {!last && <span className="absolute left-3 top-7 bottom-0 w-px bg-slate-200" aria-hidden />}

            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {isAdmin ? 'Admin offered' : 'Vendor offered'}
              </span>
              <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ${meta.cls}`}>
                <meta.Icon className="h-3 w-3" />
                {meta.label}
              </span>
            </div>

            <div className="mt-0.5 flex items-baseline gap-2">
              {r.previousPrice != null && (
                <>
                  <span className="text-sm text-slate-400 line-through">{money(r.previousPrice)}</span>
                  <ArrowRight className="h-3 w-3 text-slate-400" />
                </>
              )}
              <span className="text-lg font-bold text-slate-900">{money(r.proposedPrice)}</span>
              {r.proposedPercent != null && (
                <span className="text-xs text-slate-500">({r.proposedPercent}% of ask)</span>
              )}
            </div>

            {(r.reasonCode || r.message) && (
              <div className="mt-1 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700 ring-1 ring-slate-100">
                {r.reasonCode && <p className="font-medium text-slate-800">{reasonLabel(r.reasonCode)}</p>}
                {r.message && <p className="text-slate-600">{r.message}</p>}
              </div>
            )}

            <p className="mt-1 text-[11px] text-slate-400">{when(r.createdAt)}</p>
          </div>
        );
      })}

      {agreedPrice != null && (
        <div className="mt-2 rounded-xl bg-green-50 px-4 py-3 ring-1 ring-green-200">
          <p className="text-xs font-semibold uppercase tracking-wide text-green-700">Agreed price</p>
          <p className="text-xl font-bold text-green-800">{money(agreedPrice)}</p>
          <p className="text-xs text-green-700">This is the price the vendor will be paid per unit.</p>
        </div>
      )}
    </div>
  );
}
