'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent } from '@/components/UI/Card';
import { Button } from '@/components/UI/Button';
import {
  Search, ChevronLeft, ChevronRight, RotateCcw, Package, CreditCard,
  Eye, Image as ImageIcon, Clock, CheckCircle, XCircle,
} from 'lucide-react';
import { showSuccessToast, showErrorToast } from '@/lib/toast-utils';
import { hasPermission } from '@/lib/auth';
import { formatPrice } from '@/lib/currency';
import { returnService, reasonLabel, returnStatusStyle, RETURN_REASONS, type ReturnRequest } from '@/services/returnService';
import DateRangeCalendar from '@/components/Shared/DateRangeCalendar';
import Dropdown from '@/components/UI/Dropdown';
import ReturnDetailPanel from './ReturnDetailPanel';

const PER_PAGE = 20;

const money = (n: number, c?: string) => formatPrice(n || 0, c === 'USD' ? 'USD' : 'INR');
const fmtDate = (d?: string) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '';
// YYYY-MM-DD in local time, for comparing against the date-range picker.
const dayKey = (d?: string) => {
  if (!d) return '';
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return '';
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
};

export default function ReturnManagement() {
  const [returns, setReturns] = useState<ReturnRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [reasonFilter, setReasonFilter] = useState('all');
  const [resolutionFilter, setResolutionFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const [detailId, setDetailId] = useState<string | null>(null);

  const canManage = hasPermission('returns:manage');

  // Fetch the whole set once, then filter / count / paginate client-side — matching
  // the Coupons / Offers modules (metric cards need the full counts).
  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await returnService.getAllReturns({ limit: 1000 });
      setReturns(res.data || []);
    } catch {
      setReturns([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [filter, search, reasonFilter, resolutionFilter, dateFrom, dateTo]);

  // Per-status / per-resolution counts for the metric cards.
  const counts = useMemo(() => {
    const c = { all: returns.length, 'Pending Review': 0, 'Under Review': 0, Approved: 0, Rejected: 0, refund: 0, replacement: 0 } as Record<string, number>;
    for (const r of returns) {
      if (c[r.status] !== undefined) c[r.status] += 1;
      if (r.resolution === 'REFUND') c.refund += 1;
      else if (r.resolution === 'REPLACEMENT') c.replacement += 1;
    }
    return c;
  }, [returns]);

  // Apply the active card filter + date range + search.
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return returns.filter((r) => {
      if (filter === 'refund') { if (r.resolution !== 'REFUND') return false; }
      else if (filter === 'replacement') { if (r.resolution !== 'REPLACEMENT') return false; }
      else if (filter !== 'all') { if (r.status !== filter) return false; }

      if (reasonFilter !== 'all' && r.reason !== reasonFilter) return false;
      if (resolutionFilter !== 'all' && r.resolution !== resolutionFilter) return false;

      if (dateFrom || dateTo) {
        const k = dayKey(r.createdAt);
        if (dateFrom && k < dateFrom) return false;
        if (dateTo && k > dateTo) return false;
      }

      if (q) {
        const hay = `${r.returnId} ${r.orderCode} ${r.customerName || ''} ${r.productName || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [returns, filter, reasonFilter, resolutionFilter, dateFrom, dateTo, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const paged = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  // Metric cards — click to filter (click the active one again to clear).
  const STAT_CARDS = [
    { key: 'all',            label: 'All Requests',   subtitle: 'Every request',  Icon: RotateCcw,  iconBg: 'bg-brand-50',   iconColor: 'text-brand-500',   countColor: 'text-slate-900',   activeClass: 'border-brand-400 bg-brand-50/50' },
    { key: 'Pending Review', label: 'Pending Review', subtitle: 'Awaiting triage', Icon: Clock,      iconBg: 'bg-amber-50',   iconColor: 'text-amber-500',   countColor: 'text-amber-700',   activeClass: 'border-amber-400 bg-amber-50/60' },
    { key: 'Under Review',   label: 'Under Review',   subtitle: 'Being assessed',  Icon: Eye,        iconBg: 'bg-indigo-50',  iconColor: 'text-indigo-500',  countColor: 'text-indigo-700',  activeClass: 'border-indigo-400 bg-indigo-50/60' },
    { key: 'Approved',       label: 'Approved',       subtitle: 'Accepted',        Icon: CheckCircle, iconBg: 'bg-emerald-50', iconColor: 'text-emerald-500', countColor: 'text-emerald-700', activeClass: 'border-emerald-400 bg-emerald-50/60' },
    { key: 'Rejected',       label: 'Rejected',       subtitle: 'Declined',        Icon: XCircle,    iconBg: 'bg-red-50',     iconColor: 'text-red-500',     countColor: 'text-red-700',     activeClass: 'border-red-400 bg-red-50/60' },
    { key: 'refund',         label: 'Refund',         subtitle: 'Money back',      Icon: CreditCard, iconBg: 'bg-teal-50',    iconColor: 'text-teal-500',    countColor: 'text-teal-700',    activeClass: 'border-teal-400 bg-teal-50/60' },
    { key: 'replacement',    label: 'Replacement',    subtitle: 'Swap item',       Icon: Package,    iconBg: 'bg-blue-50',    iconColor: 'text-blue-500',    countColor: 'text-blue-700',    activeClass: 'border-blue-400 bg-blue-50/60' },
  ] as const;

  return (
    <div className="px-4 pb-6 pt-3 sm:px-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-[#e01a1b]/10 text-[#e01a1b]">
            <RotateCcw className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Returns &amp; Replacements</h1>
            <p className="text-sm text-slate-500">Review and process customer return, refund and replacement requests.</p>
          </div>
        </div>
      </div>

      {/* Metric cards — click a card to filter (click the active one to clear) */}
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-7">
        {STAT_CARDS.map(({ key, label, subtitle, Icon, iconBg, iconColor, countColor, activeClass }) => {
          const isActive = filter === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setFilter((prev) => (prev === key ? 'all' : key))}
              className={`group text-left bg-white border rounded-2xl shadow-xs transition-all duration-200 hover:shadow-sm ${isActive ? activeClass : 'border-slate-200/80 hover:border-slate-300'}`}
            >
              <div className="flex flex-row items-center justify-between px-3.5 pt-3 pb-1">
                <span className="text-[13px] font-medium text-slate-500">{label}</span>
                <div className={`p-1.5 rounded-lg ${isActive ? iconBg.replace('50', '100') : iconBg} transition-transform duration-150 group-hover:scale-110`}>
                  <Icon className={`h-4 w-4 ${iconColor}`} />
                </div>
              </div>
              <div className="px-3.5 pb-3">
                <div className={`text-xl font-bold ${countColor}`}>{counts[key] ?? 0}</div>
                <p className="text-[11px] text-slate-400 mt-0.5">{subtitle}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Search + reason / resolution / date filters */}
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search ID, order, customer, product…"
            className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm outline-none focus:border-[#e01a1b] focus:ring-2 focus:ring-[#e01a1b]/15" />
        </div>
        <div className="w-full shrink-0 sm:w-52">
          <Dropdown
            value={reasonFilter}
            onChange={(v) => setReasonFilter(v as string)}
            buttonClassName="py-2 rounded-lg text-sm"
            options={[{ value: 'all', label: 'All reasons' }, ...RETURN_REASONS.map((r) => ({ value: r.code, label: r.label }))]}
          />
        </div>
        <div className="w-full shrink-0 sm:w-44">
          <Dropdown
            value={resolutionFilter}
            onChange={(v) => setResolutionFilter(v as string)}
            buttonClassName="py-2 rounded-lg text-sm"
            options={[
              { value: 'all', label: 'All resolutions' },
              { value: 'REFUND', label: 'Refund' },
              { value: 'REPLACEMENT', label: 'Replacement' },
            ]}
          />
        </div>
        <div className="shrink-0">
          <DateRangeCalendar
            from={dateFrom}
            to={dateTo}
            placeholder="Request Date"
            onChange={(f, t) => { setDateFrom(f); setDateTo(t); }}
          />
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center text-slate-400">Loading…</div>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="py-16 text-center">
          <Package className="mx-auto h-10 w-10 text-slate-300" />
          <p className="mt-3 font-semibold text-slate-700">No return requests</p>
          <p className="text-sm text-slate-500">Nothing matches this filter yet.</p>
        </CardContent></Card>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="hidden gap-3 border-b border-slate-100 bg-slate-50 px-4 py-2.5 text-[11px] font-bold uppercase tracking-wide text-slate-500 lg:grid lg:grid-cols-[1.7fr_1fr_1.5fr_0.9fr_0.9fr_0.7fr_1fr_0.7fr]">
            <div>Request / Product</div>
            <div>Customer</div>
            <div>Reason</div>
            <div>Resolution</div>
            <div>Request Date</div>
            <div>Amount</div>
            <div>Status</div>
            <div className="text-right">Action</div>
          </div>
          {paged.map((r) => {
            const st = returnStatusStyle(r.status);
            return (
              <div key={r.id} className="grid grid-cols-1 gap-3 border-b border-slate-50 px-4 py-3 last:border-0 hover:bg-slate-50/60 lg:grid-cols-[1.7fr_1fr_1.5fr_0.9fr_0.9fr_0.7fr_1fr_0.7fr] lg:items-center">
                <div className="flex items-center gap-3">
                  <img src={r.productImage || '/assets/images/placeholder.png'} alt="" className="h-11 w-11 shrink-0 rounded-lg object-cover" />
                  <div className="min-w-0">
                    <p className="text-[12px] font-bold text-slate-900">{r.returnId}</p>
                    <p className="truncate text-[13px] text-slate-600">{r.productName}</p>
                    <p className="text-[11px] text-slate-400">#{r.orderCode}</p>
                  </div>
                </div>
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-medium text-slate-800">{r.customerName || '—'}</p>
                  <p className="text-[11px] text-slate-400">{r.customerReturnCount ? `${r.customerReturnCount} return${r.customerReturnCount === 1 ? '' : 's'}` : ''}</p>
                </div>
                <div className="text-[13px] text-slate-600">
                  {reasonLabel(r.reason)}
                  {r.evidenceImages?.length > 0 && (
                    <span className="ml-1 inline-flex items-center gap-0.5 text-[11px] text-slate-400"><ImageIcon className="h-3 w-3" />{r.evidenceImages.length}</span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 whitespace-nowrap text-[13px] text-slate-600">
                  {r.resolution === 'REFUND' ? <CreditCard className="h-3.5 w-3.5 shrink-0 text-slate-400" /> : <Package className="h-3.5 w-3.5 shrink-0 text-slate-400" />}
                  {r.resolution === 'REFUND' ? 'Refund' : 'Replacement'}
                </div>
                <div className="whitespace-nowrap text-[13px] text-slate-600">
                  {fmtDate(r.createdAt)}
                </div>
                <div className="text-[13px] font-semibold text-slate-800">
                  {money(r.resolution === 'REFUND' ? (r.refundAmount ?? r.itemAmount) : (r.replacementValue ?? r.itemAmount), r.currency)}
                </div>
                <div>
                  <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[10.5px] font-semibold ${st.bg} ${st.text}`}>
                    <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${st.dot}`} />{r.status}
                  </span>
                </div>
                <div className="flex lg:justify-end">
                  <button onClick={() => setDetailId(r.id)} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-[12px] font-semibold text-slate-700 hover:bg-white">
                    <Eye className="h-3.5 w-3.5" /> View
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}><ChevronLeft className="h-4 w-4" /></Button>
          <span className="text-sm text-slate-500">Page {page} of {totalPages}</span>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}><ChevronRight className="h-4 w-4" /></Button>
        </div>
      )}

      {detailId && (
        <ReturnDetailPanel
          id={detailId}
          canManage={canManage}
          onClose={() => setDetailId(null)}
          onChanged={load}
          notifySuccess={(m) => showSuccessToast('Updated', m)}
          notifyError={(m) => showErrorToast('Failed', m)}
        />
      )}
    </div>
  );
}
