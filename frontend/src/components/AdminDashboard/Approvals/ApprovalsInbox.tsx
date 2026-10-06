'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent } from '@/components/UI/Card';
import { ShieldCheck, Loader2, CheckCircle2, XCircle, Clock, X, User } from 'lucide-react';
import { showSuccessToast, showErrorToast } from '@/lib/toast-utils';
import { approvalService, type ApprovalItem, type ApprovalModule, MODULE_STYLE } from '@/services/approvalService';

export default function ApprovalsInbox() {
  const [items, setItems] = useState<ApprovalItem[]>([]);
  const [modules, setModules] = useState<ApprovalModule[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<ApprovalModule | 'all'>('all');
  const [rejecting, setRejecting] = useState<ApprovalItem | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await approvalService.listPending();
      setItems(res.data || []);
      setModules(res.modules || []);
    } catch {
      showErrorToast('Failed', 'Could not load pending approvals.');
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const approve = async (item: ApprovalItem) => {
    try {
      setBusyId(item.id);
      await approvalService.approve(item.module, item.id);
      showSuccessToast('Approved', `${item.title} is now live.`);
      setItems((prev) => prev.filter((i) => !(i.id === item.id && i.module === item.module)));
    } catch (e: any) {
      showErrorToast('Failed', e?.response?.data?.message || 'Could not approve.');
    } finally { setBusyId(null); }
  };

  const shown = filter === 'all' ? items : items.filter((i) => i.module === filter);
  const moduleLabel: Record<ApprovalModule, string> = { coupon: 'Coupons', offer: 'Offers', settlement: 'Settlements', credit_points: 'Credit Points' };

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-6 flex items-center gap-3">
        <span className="grid h-11 w-11 place-items-center rounded-xl bg-[#e01a1b]/10 text-[#e01a1b]"><ShieldCheck className="h-5 w-5" /></span>
        <div>
          <h1 className="text-xl font-bold text-slate-900">Approvals</h1>
          <p className="text-sm text-slate-500">Items waiting for your approval before they go live.</p>
        </div>
        {!loading && (
          <span className="ml-auto rounded-full bg-[#e01a1b] px-3 py-1 text-sm font-bold text-white">{items.length}</span>
        )}
      </div>

      {/* Module filter */}
      {modules.length > 1 && (
        <div className="mb-4 flex flex-wrap gap-2">
          <button onClick={() => setFilter('all')} className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${filter === 'all' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
            All ({items.length})
          </button>
          {modules.map((m) => {
            const c = items.filter((i) => i.module === m).length;
            return (
              <button key={m} onClick={() => setFilter(m)} className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${filter === m ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                {moduleLabel[m]} ({c})
              </button>
            );
          })}
        </div>
      )}

      {loading ? (
        <div className="py-20 text-center text-slate-400"><Loader2 className="mx-auto h-6 w-6 animate-spin" /></div>
      ) : shown.length === 0 ? (
        <Card><CardContent className="py-16 text-center">
          <CheckCircle2 className="mx-auto h-10 w-10 text-green-300" />
          <p className="mt-3 font-semibold text-slate-700">Nothing pending</p>
          <p className="text-sm text-slate-500">
            {modules.length === 0 ? 'You do not have approval permission for any module yet.' : 'All caught up — no items waiting for approval.'}
          </p>
        </CardContent></Card>
      ) : (
        <div className="space-y-3">
          {shown.map((item) => (
            <Card key={`${item.module}-${item.id}`} className="rounded-2xl border-slate-200">
              <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`rounded-md px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${MODULE_STYLE[item.module]}`}>{item.moduleLabel}</span>
                    <p className="truncate font-semibold text-slate-900">{item.title}</p>
                  </div>
                  <p className="mt-1 text-sm text-slate-600">{item.subtitle}</p>
                  <p className="mt-0.5 flex items-center gap-2 text-[12px] text-slate-400">
                    {item.submittedByName && <span className="inline-flex items-center gap-1"><User className="h-3 w-3" />{item.submittedByName}</span>}
                    <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" />{new Date(item.createdAt).toLocaleString()}</span>
                  </p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => approve(item)} disabled={busyId === item.id}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-60">
                    <CheckCircle2 className="h-4 w-4" /> Approve
                  </button>
                  <button onClick={() => setRejecting(item)} disabled={busyId === item.id}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-red-300 px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-60">
                    <XCircle className="h-4 w-4" /> Reject
                  </button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {rejecting && (
        <RejectModal
          item={rejecting}
          onClose={() => setRejecting(null)}
          onDone={() => { setRejecting(null); load(); }}
        />
      )}
    </div>
  );
}

function RejectModal({ item, onClose, onDone }: { item: ApprovalItem; onClose: () => void; onDone: () => void }) {
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (!reason.trim()) { showErrorToast('Required', 'Please give a reason for rejection.'); return; }
    try {
      setBusy(true);
      await approvalService.reject(item.module, item.id, reason.trim());
      showSuccessToast('Rejected', `${item.title} was rejected.`);
      onDone();
    } catch (e: any) {
      showErrorToast('Failed', e?.response?.data?.message || 'Could not reject.');
    } finally { setBusy(false); }
  };
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 p-4">
          <h3 className="text-base font-bold text-slate-900">Reject — {item.title}</h3>
          <button onClick={onClose} className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100"><X className="h-5 w-5" /></button>
        </div>
        <div className="space-y-3 p-4">
          <label className="block text-[13px] font-semibold text-slate-700">Reason</label>
          <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#e01a1b] focus:ring-2 focus:ring-[#e01a1b]/15"
            placeholder="Why is this being rejected?" />
          <div className="flex gap-2 pt-1">
            <button onClick={onClose} className="flex-1 rounded-lg border border-slate-200 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancel</button>
            <button onClick={submit} disabled={busy} className="flex-1 rounded-lg bg-red-600 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60">{busy ? 'Rejecting…' : 'Confirm Reject'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
