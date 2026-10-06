'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/UI/Card';
import Dropdown from '@/components/UI/Dropdown';
import { Inbox, Loader2, Clock, CheckCircle2, XCircle, UserPlus, Send, X, ExternalLink, AlertTriangle, UserCheck, Trash2 } from 'lucide-react';
import { showSuccessToast, showErrorToast } from '@/lib/toast-utils';
import { workflowService, type WorkflowTask, type WorkflowAction, type WorkflowDelegation, ACTION_LABEL } from '@/services/workflowService';
import { userManagementService } from '@/services/userManagementService';

const ACTION_ICON: Record<WorkflowAction, React.ReactNode> = {
  APPROVE: <CheckCircle2 className="h-4 w-4" />, REJECT: <XCircle className="h-4 w-4" />,
  ASSIGN: <UserPlus className="h-4 w-4" />, SUBMIT: <Send className="h-4 w-4" />,
  REQUEST_CHANGES: <XCircle className="h-4 w-4" />,
};
const ACTION_STYLE: Record<WorkflowAction, string> = {
  APPROVE: 'bg-green-600 hover:bg-green-700 text-white',
  SUBMIT: 'bg-blue-600 hover:bg-blue-700 text-white',
  ASSIGN: 'bg-indigo-600 hover:bg-indigo-700 text-white',
  REJECT: 'bg-red-600 hover:bg-red-700 text-white',
  REQUEST_CHANGES: 'bg-amber-600 hover:bg-amber-700 text-white',
};

interface StaffOpt { id: string; name: string; email: string }

export default function MyTasks() {
  const [tasks, setTasks] = useState<WorkflowTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [staff, setStaff] = useState<StaffOpt[]>([]);
  const [modal, setModal] = useState<{ task: WorkflowTask; action: WorkflowAction } | null>(null);
  const [delegations, setDelegations] = useState<WorkflowDelegation[]>([]);
  const [delegateOpen, setDelegateOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [t, d] = await Promise.all([
        workflowService.myTasks(),
        workflowService.myDelegations().catch(() => ({ data: [] as WorkflowDelegation[] })),
      ]);
      setTasks(t.data || []);
      setDelegations(d.data || []);
    } catch {
      showErrorToast('Failed', 'Could not load your tasks.');
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const loadStaff = useCallback(() => {
    if (staff.length) return;
    userManagementService.getStaff().then((s) =>
      setStaff((s || []).map((x) => ({ id: x.id, name: `${x.firstName || ''} ${x.lastName || ''}`.trim() || x.email, email: x.email })))
    ).catch(() => {});
  }, [staff.length]);

  // Lazy-load staff when an ASSIGN modal or the delegate modal opens.
  useEffect(() => {
    if ((modal?.action === 'ASSIGN' || delegateOpen) && staff.length === 0) loadStaff();
  }, [modal, delegateOpen, staff.length, loadStaff]);

  const activeDelegations = delegations.filter((d) => d.isActive);
  const endDelegation = async (id: string) => {
    try { await workflowService.endDelegation(id); showSuccessToast('Ended', 'Delegation ended.'); load(); }
    catch (e: any) { showErrorToast('Failed', e?.response?.data?.message || 'Could not end.'); }
  };

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-6 flex items-center gap-3">
        <span className="grid h-11 w-11 place-items-center rounded-xl bg-[#e01a1b]/10 text-[#e01a1b]"><Inbox className="h-5 w-5" /></span>
        <div>
          <h1 className="text-xl font-bold text-slate-900">My Tasks</h1>
          <p className="text-sm text-slate-500">Approvals and actions waiting on you.</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {!loading && tasks.length > 0 && (
            <span className="rounded-full bg-[#e01a1b] px-3 py-1 text-sm font-bold text-white">{tasks.length}</span>
          )}
          <button onClick={() => setDelegateOpen(true)} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
            <UserCheck className="h-4 w-4" /> Delegate
          </button>
        </div>
      </div>

      {activeDelegations.length > 0 && (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3">
          <p className="mb-1.5 text-[13px] font-semibold text-amber-800">Your tasks are being covered by:</p>
          <div className="flex flex-wrap gap-2">
            {activeDelegations.map((d) => (
              <span key={d.id} className="inline-flex items-center gap-2 rounded-full border border-amber-300 bg-white px-2.5 py-1 text-[12px] text-slate-700">
                <UserCheck className="h-3.5 w-3.5 text-amber-600" />
                {d.toName || 'Someone'}{d.endsAt ? ` · until ${new Date(d.endsAt).toLocaleDateString()}` : ''}
                <button onClick={() => endDelegation(d.id)} className="text-red-500 hover:text-red-600"><Trash2 className="h-3.5 w-3.5" /></button>
              </span>
            ))}
          </div>
        </div>
      )}

      {loading ? (
        <div className="py-20 text-center text-slate-400"><Loader2 className="mx-auto h-6 w-6 animate-spin" /></div>
      ) : tasks.length === 0 ? (
        <Card><CardContent className="py-16 text-center">
          <CheckCircle2 className="mx-auto h-10 w-10 text-green-300" />
          <p className="mt-3 font-semibold text-slate-700">All clear</p>
          <p className="text-sm text-slate-500">You have no pending tasks right now.</p>
        </CardContent></Card>
      ) : (
        <div className="space-y-3">
          {tasks.map((t) => {
            const overdue = t.dueAt && new Date(t.dueAt) < new Date();
            return (
              <Card key={t.id} className="rounded-2xl border-slate-200">
                <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">{t.subjectType}</span>
                      <p className="truncate font-semibold text-slate-900">{t.subjectLabel || t.subjectId}</p>
                      {t.escalated && (
                        <span className="inline-flex items-center gap-1 rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-amber-700">
                          <AlertTriangle className="h-3 w-3" /> Escalated
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-slate-600">
                      Stage {t.stageOrder}: <span className="font-medium">{t.stageName}</span>
                    </p>
                    <p className="mt-0.5 flex items-center gap-1 text-[12px] text-slate-400">
                      <Clock className="h-3 w-3" /> {new Date(t.createdAt).toLocaleString()}
                      {t.dueAt && <span className={overdue ? 'ml-2 font-semibold text-red-500' : 'ml-2'}>· Due {new Date(t.dueAt).toLocaleDateString()}</span>}
                      <Link href={`/admin/dashboard/workflows/instances/${t.instanceId}`} className="ml-2 inline-flex items-center gap-0.5 text-[#e01a1b] hover:underline">
                        View flow <ExternalLink className="h-3 w-3" />
                      </Link>
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {t.actions.map((a) => (
                      <button key={a} onClick={() => setModal({ task: t, action: a })}
                        className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold ${ACTION_STYLE[a]}`}>
                        {ACTION_ICON[a]} {ACTION_LABEL[a]}
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {modal && (
        <ActionModal
          task={modal.task}
          action={modal.action}
          staff={staff}
          onClose={() => setModal(null)}
          onDone={() => { setModal(null); load(); }}
        />
      )}

      {delegateOpen && (
        <DelegateModal staff={staff} onClose={() => setDelegateOpen(false)} onDone={() => { setDelegateOpen(false); load(); }} />
      )}
    </div>
  );
}

function DelegateModal({ staff, onClose, onDone }: { staff: StaffOpt[]; onClose: () => void; onDone: () => void }) {
  const [toAdminId, setToAdminId] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!toAdminId) { showErrorToast('Required', 'Pick who will cover your tasks.'); return; }
    try {
      setBusy(true);
      const toName = staff.find((s) => s.id === toAdminId)?.name;
      await workflowService.createDelegation({ toAdminId, toName, reason: reason.trim() || undefined, endsAt: endsAt || undefined });
      showSuccessToast('Delegated', 'Your tasks will be covered.');
      onDone();
    } catch (e: any) { showErrorToast('Failed', e?.response?.data?.message || 'Could not delegate.'); }
    finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 p-4">
          <h3 className="text-base font-bold text-slate-900">Delegate my tasks</h3>
          <button onClick={onClose} className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100"><X className="h-5 w-5" /></button>
        </div>
        <div className="space-y-3 p-4">
          <p className="text-[13px] text-slate-500">While active, whoever you pick can act on tasks assigned directly to you.</p>
          <div>
            <label className="mb-1 block text-[13px] font-semibold text-slate-700">Cover me</label>
            <Dropdown value={toAdminId} onChange={(v) => setToAdminId(v as string)}
              options={[{ value: '', label: 'Select a person' }, ...staff.map((s) => ({ value: s.id, label: `${s.name} · ${s.email}` }))]} buttonClassName="py-2 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-[13px] font-semibold text-slate-700">Until <span className="font-normal text-slate-400">(optional)</span></label>
            <input type="date" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#e01a1b] focus:ring-2 focus:ring-[#e01a1b]/15" />
          </div>
          <div>
            <label className="mb-1 block text-[13px] font-semibold text-slate-700">Reason <span className="font-normal text-slate-400">(optional)</span></label>
            <input value={reason} onChange={(e) => setReason(e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#e01a1b] focus:ring-2 focus:ring-[#e01a1b]/15" placeholder="e.g. On leave" />
          </div>
          <div className="flex gap-2 pt-1">
            <button onClick={onClose} className="flex-1 rounded-lg border border-slate-200 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancel</button>
            <button onClick={submit} disabled={busy} className="flex-1 rounded-lg bg-[#e01a1b] py-2 text-sm font-semibold text-white hover:bg-[#c41617] disabled:opacity-60">{busy ? 'Saving…' : 'Delegate'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ActionModal({ task, action, staff, onClose, onDone }: {
  task: WorkflowTask; action: WorkflowAction; staff: StaffOpt[]; onClose: () => void; onDone: () => void;
}) {
  const [comment, setComment] = useState('');
  const [assignTo, setAssignTo] = useState('');
  const [busy, setBusy] = useState(false);
  const needsAssignee = action === 'ASSIGN';
  const destructive = action === 'REJECT' || action === 'REQUEST_CHANGES';

  const submit = async () => {
    if (needsAssignee && !assignTo) { showErrorToast('Required', 'Pick a person to assign.'); return; }
    try {
      setBusy(true);
      await workflowService.actOnTask(task.id, { action, comment: comment.trim() || undefined, assignTo: assignTo || undefined });
      showSuccessToast('Done', `${ACTION_LABEL[action]} recorded.`);
      onDone();
    } catch (e: any) {
      showErrorToast('Failed', e?.response?.data?.message || 'Could not complete the action.');
    } finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 p-4">
          <h3 className="text-base font-bold text-slate-900">{ACTION_LABEL[action]} — {task.stageName}</h3>
          <button onClick={onClose} className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100"><X className="h-5 w-5" /></button>
        </div>
        <div className="space-y-3 p-4">
          <p className="text-sm text-slate-600">
            Subject: <span className="font-semibold text-slate-800">{task.subjectLabel || task.subjectId}</span>
          </p>
          {needsAssignee && (
            <div>
              <label className="mb-1 block text-[13px] font-semibold text-slate-700">Assign to</label>
              <Dropdown value={assignTo} onChange={(v) => setAssignTo(v as string)}
                options={[{ value: '', label: 'Select a person' }, ...staff.map((s) => ({ value: s.id, label: `${s.name} · ${s.email}` }))]}
                buttonClassName="py-2 text-sm" />
              <p className="mt-1 text-[12px] text-slate-400">This person will get the next stage’s task.</p>
            </div>
          )}
          <div>
            <label className="mb-1 block text-[13px] font-semibold text-slate-700">
              Comment {destructive && <span className="text-slate-400">(recommended)</span>}
            </label>
            <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={3}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#e01a1b] focus:ring-2 focus:ring-[#e01a1b]/15"
              placeholder={destructive ? 'Reason for rejection / changes…' : 'Optional note…'} />
          </div>
          <div className="flex gap-2 pt-1">
            <button onClick={onClose} className="flex-1 rounded-lg border border-slate-200 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancel</button>
            <button onClick={submit} disabled={busy}
              className={`flex-1 rounded-lg py-2 text-sm font-semibold text-white disabled:opacity-60 ${destructive ? 'bg-red-600 hover:bg-red-700' : 'bg-[#e01a1b] hover:bg-[#c41617]'}`}>
              {busy ? 'Working…' : `Confirm ${ACTION_LABEL[action]}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
