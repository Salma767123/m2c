'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/UI/Card';
import { Button } from '@/components/UI/Button';
import { Wallet, Search, ChevronLeft, ChevronRight, Eye } from 'lucide-react';
import { formatPrice } from '@/lib/currency';
import { hasPermission } from '@/lib/auth';
import { showSuccessToast, showErrorToast } from '@/lib/toast-utils';
import { walletService } from '@/services/walletService';
import WalletDetailPanel from './WalletDetailPanel';

const inr = (n: number) => formatPrice(n || 0, 'INR');
const fmtDate = (d?: string) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '';

export default function WalletManagement() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalBalance, setTotalBalance] = useState(0);
  const [total, setTotal] = useState(0);
  const [detailCustomer, setDetailCustomer] = useState<{ id: string; name: string } | null>(null);

  const canAdjust = hasPermission('wallet:adjust');

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await walletService.getAllWallets({ page, limit: 20, search: search || undefined });
      setRows(res.data || []);
      setTotalPages(res.pagination?.totalPages || 1);
      setTotalBalance(res.totalBalance || 0);
      setTotal(res.pagination?.total || 0);
    } catch { setRows([]); }
    finally { setLoading(false); }
  }, [page, search]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [search]);

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-[#e01a1b]/10 text-[#e01a1b]">
            <Wallet className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Customer Wallets</h1>
            <p className="text-sm text-slate-500">Store-credit balances, history and manual adjustments.</p>
          </div>
        </div>
        <div className="flex gap-3">
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-center">
            <div className="text-lg font-bold text-slate-900">{total}</div>
            <div className="text-[11px] text-slate-400">Wallets</div>
          </div>
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-center">
            <div className="text-lg font-bold text-emerald-700">{inr(totalBalance)}</div>
            <div className="text-[11px] text-emerald-600/70">Outstanding credit</div>
          </div>
        </div>
      </div>

      <div className="mb-4 relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search customer name or email…"
          className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm outline-none focus:border-[#e01a1b] focus:ring-2 focus:ring-[#e01a1b]/15" />
      </div>

      {loading ? (
        <div className="py-20 text-center text-slate-400">Loading…</div>
      ) : rows.length === 0 ? (
        <Card><CardContent className="py-16 text-center">
          <Wallet className="mx-auto h-10 w-10 text-slate-300" />
          <p className="mt-3 font-semibold text-slate-700">No wallets yet</p>
          <p className="text-sm text-slate-500">Wallets are created when a customer earns store credit.</p>
        </CardContent></Card>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="hidden gap-3 border-b border-slate-100 bg-slate-50 px-4 py-2.5 text-[11px] font-bold uppercase tracking-wide text-slate-500 lg:grid lg:grid-cols-[2fr_1.2fr_1fr_0.8fr]">
            <div>Customer</div>
            <div>Balance</div>
            <div>Updated</div>
            <div className="text-right">Action</div>
          </div>
          {rows.map((w) => (
            <div key={w.id} className="grid grid-cols-1 gap-2 border-b border-slate-50 px-4 py-3 last:border-0 hover:bg-slate-50/60 lg:grid-cols-[2fr_1.2fr_1fr_0.8fr] lg:items-center">
              <div className="min-w-0">
                <p className="truncate text-[13px] font-semibold text-slate-800">{w.customerName}</p>
                <p className="truncate text-[12px] text-slate-400">{w.customerEmail}</p>
              </div>
              <div className="text-sm font-bold text-emerald-700">{inr(w.balance)}</div>
              <div className="text-[12px] text-slate-500">{fmtDate(w.updatedAt)}</div>
              <div className="flex lg:justify-end">
                <button onClick={() => setDetailCustomer({ id: w.customerId, name: w.customerName })}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-[12px] font-semibold text-slate-700 hover:bg-white">
                  <Eye className="h-3.5 w-3.5" /> View
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}><ChevronLeft className="h-4 w-4" /></Button>
          <span className="text-sm text-slate-500">Page {page} of {totalPages}</span>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}><ChevronRight className="h-4 w-4" /></Button>
        </div>
      )}

      {detailCustomer && (
        <WalletDetailPanel
          customerId={detailCustomer.id}
          customerName={detailCustomer.name}
          canAdjust={canAdjust}
          onClose={() => setDetailCustomer(null)}
          onChanged={load}
          notifySuccess={(m) => showSuccessToast('Wallet updated', m)}
          notifyError={(m) => showErrorToast('Failed', m)}
        />
      )}
    </div>
  );
}
