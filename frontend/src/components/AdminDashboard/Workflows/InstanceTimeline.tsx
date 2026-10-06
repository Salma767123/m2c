'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/UI/Card';
import { Button } from '@/components/UI/Button';
import {
  ArrowLeft, Loader2, CheckCircle2, XCircle, Circle, Dot, Ban, Clock, User, MessageSquare,
} from 'lucide-react';
import { hasPermission } from '@/lib/auth';
import { showSuccessToast, showErrorToast } from '@/lib/toast-utils';
import { workflowService, type WorkflowInstance, INSTANCE_STATUS_STYLE } from '@/services/workflowService';

export default function InstanceTimeline({ instanceId }: { instanceId: string }) {
  const router = useRouter();
  const [inst, setInst] = useState<WorkflowInstance | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await workflowService.getInstance(instanceId);
      setInst(res.data);
    } catch { showErrorToast('Failed', 'Could not load this workflow.'); }
    finally { setLoading(false); }
  }, [instanceId]);
  useEffect(() => { load(); }, [load]);

  const cancel = async () => {
    if (!inst) return;
    const reason = window.prompt('Cancel this workflow? Optional reason:');
    if (reason === null) return;
    try { await workflowService.cancelInstance(inst.id, reason || undefined); showSuccessToast('Cancelled', 'Workflow cancelled.'); load(); }
    catch (e: any) { showErrorToast('Failed', e?.response?.data?.message || 'Could not cancel.'); }
  };

  if (loading) return <div className="py-20 text-center text-slate-400"><Loader2 className="mx-auto h-6 w-6 animate-spin" /></div>;
  if (!inst) return <div className="p-6 text-center text-slate-500">Workflow not found.</div>;

  const stages = inst.stages || [];
  const current = inst.currentStageOrder;
  const isDone = inst.status !== 'ACTIVE';

  const stageState = (order: number): 'done' | 'current' | 'pending' => {
    if (inst.status === 'COMPLETED') return 'done';
    if (order < current) return 'done';
    if (order === current && inst.status === 'ACTIVE') return 'current';
    return 'pending';
  };

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50"><ArrowLeft className="h-4 w-4" /></button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900">{inst.subjectLabel || inst.subjectId}</h1>
              <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${INSTANCE_STATUS_STYLE[inst.status]}`}>{inst.status}</span>
            </div>
            <p className="text-sm text-slate-500">{inst.name} · {inst.subjectType} · started by {inst.initiatedByName || '—'}</p>
          </div>
        </div>
        {inst.status === 'ACTIVE' && (hasPermission('workflows:cancel') || hasPermission('workflows:edit')) && (
          <Button variant="outline" onClick={cancel}><Ban className="mr-1.5 h-4 w-4" /> Cancel</Button>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Stage progress */}
        <Card className="rounded-2xl border-slate-200">
          <CardContent className="p-4">
            <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-slate-500">Stages</h2>
            <ol className="relative space-y-0">
              {stages.map((s, i) => {
                const st = stageState(s.order);
                return (
                  <li key={s.id || i} className="flex gap-3 pb-6 last:pb-0">
                    <div className="flex flex-col items-center">
                      {st === 'done' ? <CheckCircle2 className="h-6 w-6 text-green-600" />
                        : st === 'current' ? <Circle className="h-6 w-6 animate-pulse text-blue-600" />
                        : <Circle className="h-6 w-6 text-slate-300" />}
                      {i < stages.length - 1 && <span className={`mt-1 w-0.5 flex-1 ${st === 'done' ? 'bg-green-300' : 'bg-slate-200'}`} />}
                    </div>
                    <div className="pb-1">
                      <p className={`text-sm font-semibold ${st === 'pending' ? 'text-slate-400' : 'text-slate-900'}`}>
                        Stage {s.order}: {s.name}
                      </p>
                      {s.description && <p className="text-[12px] text-slate-500">{s.description}</p>}
                      <p className="mt-0.5 text-[11px] text-slate-400">
                        {st === 'current' ? 'In progress' : st === 'done' ? 'Completed' : 'Pending'}
                        {' · '}{(s.actions || []).join(' / ')}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ol>
          </CardContent>
        </Card>

        {/* History / audit */}
        <Card className="rounded-2xl border-slate-200">
          <CardContent className="p-4">
            <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-slate-500">Activity</h2>
            <div className="space-y-3">
              {(inst.history || []).map((h) => (
                <div key={h.id} className="flex gap-3">
                  <div className="mt-0.5">
                    {h.action === 'APPROVE' || h.action === 'SUBMIT' || h.action === 'COMPLETED' ? <CheckCircle2 className="h-4 w-4 text-green-600" />
                      : h.action === 'REJECT' || h.action === 'REJECTED' ? <XCircle className="h-4 w-4 text-red-600" />
                      : h.action === 'CANCELLED' ? <Ban className="h-4 w-4 text-slate-400" />
                      : <Dot className="h-4 w-4 text-slate-400" />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm text-slate-800">
                      <span className="font-semibold">{h.action}</span>
                      {h.stageName && <span className="text-slate-500"> · {h.stageName}</span>}
                    </p>
                    <p className="flex items-center gap-2 text-[12px] text-slate-400">
                      <span className="inline-flex items-center gap-1"><User className="h-3 w-3" />{h.actorName || 'System'}</span>
                      <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" />{new Date(h.createdAt).toLocaleString()}</span>
                    </p>
                    {h.comment && (
                      <p className="mt-1 flex items-start gap-1 rounded-lg bg-slate-50 px-2 py-1 text-[12px] text-slate-600">
                        <MessageSquare className="mt-0.5 h-3 w-3 shrink-0" />{h.comment}
                      </p>
                    )}
                  </div>
                </div>
              ))}
              {(!inst.history || inst.history.length === 0) && <p className="text-sm text-slate-400">No activity yet.</p>}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
