'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/UI/Card';
import { Button } from '@/components/UI/Button';
import {
  Workflow, Plus, Pencil, Trash2, Loader2, GitBranch, Play, CheckCircle2, XCircle, Ban, Clock, X, Rocket, AlertTriangle, TrendingUp,
} from 'lucide-react';
import Dropdown from '@/components/UI/Dropdown';
import { hasPermission } from '@/lib/auth';
import { showSuccessToast, showErrorToast } from '@/lib/toast-utils';
import {
  workflowService, type WorkflowDefinition, type WorkflowInstance, type WorkflowStats, INSTANCE_STATUS_STYLE,
} from '@/services/workflowService';
import DefinitionEditor from './DefinitionEditor';

type Tab = 'overview' | 'definitions' | 'instances';

export default function WorkflowManagement() {
  const [tab, setTab] = useState<Tab>('overview');
  const [defs, setDefs] = useState<WorkflowDefinition[]>([]);
  const [instances, setInstances] = useState<WorkflowInstance[]>([]);
  const [stats, setStats] = useState<WorkflowStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<{ id?: string } | null>(null);
  const [starting, setStarting] = useState(false);

  const canCreate = hasPermission('workflows:create');
  const canEdit = hasPermission('workflows:edit');
  const canDelete = hasPermission('workflows:delete');
  const canStart = hasPermission('workflows:start') || hasPermission('workflows:create');

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [d, i, s] = await Promise.all([
        workflowService.listDefinitions(),
        workflowService.listInstances().catch(() => ({ data: [] as WorkflowInstance[] })),
        workflowService.getStats().catch(() => ({ data: null as WorkflowStats | null })),
      ]);
      setDefs(d.data || []);
      setInstances(i.data || []);
      setStats(s.data || null);
    } catch {
      showErrorToast('Failed', 'Could not load workflows.');
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const removeDef = async (def: WorkflowDefinition) => {
    if (!window.confirm(`Delete workflow "${def.name}"?`)) return;
    try { await workflowService.deleteDefinition(def.id); showSuccessToast('Deleted', 'Workflow removed.'); load(); }
    catch (e: any) { showErrorToast('Cannot delete', e?.response?.data?.message || 'Failed.'); }
  };

  if (editing) {
    return <DefinitionEditor definitionId={editing.id} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />;
  }

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-[#e01a1b]/10 text-[#e01a1b]"><Workflow className="h-5 w-5" /></span>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Workflows</h1>
            <p className="text-sm text-slate-500">Design multi-stage approval flows for any process.</p>
          </div>
        </div>
        <div className="flex gap-2">
          {canStart && defs.length > 0 && (
            <Button variant="outline" onClick={() => setStarting(true)}><Rocket className="mr-1.5 h-4 w-4" /> Start Workflow</Button>
          )}
          {tab === 'definitions' && canCreate && (
            <Button onClick={() => setEditing({})}><Plus className="mr-1.5 h-4 w-4" /> New Workflow</Button>
          )}
        </div>
      </div>

      <div className="mb-4 flex gap-1 rounded-xl bg-slate-100 p-1">
        {(['overview', 'definitions', 'instances'] as Tab[]).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 rounded-lg px-4 py-2 text-sm font-semibold capitalize transition ${tab === t ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            {t === 'overview' ? 'Overview' : t === 'definitions' ? 'Workflow Templates' : 'Running & History'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="py-20 text-center text-slate-400"><Loader2 className="mx-auto h-6 w-6 animate-spin" /></div>
      ) : tab === 'overview' ? (
        <OverviewPanel stats={stats} defs={defs} />
      ) : tab === 'definitions' ? (
        defs.length === 0 ? (
          <Card><CardContent className="py-16 text-center">
            <Workflow className="mx-auto h-10 w-10 text-slate-300" />
            <p className="mt-3 font-semibold text-slate-700">No workflows yet</p>
            <p className="text-sm text-slate-500">Create your first approval workflow — it can be for any process.</p>
          </CardContent></Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {defs.map((d) => (
              <Card key={d.id} className="rounded-2xl border-slate-200">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="truncate font-semibold text-slate-900">{d.name}</p>
                        {!d.isActive && <span className="rounded bg-slate-100 px-1.5 text-[10px] font-semibold text-slate-400">INACTIVE</span>}
                      </div>
                      <p className="mt-0.5 text-[12px] text-slate-500">{d.description || 'No description'}</p>
                    </div>
                    <div className="flex gap-1.5">
                      {canEdit && <button onClick={() => setEditing({ id: d.id })} className="rounded-lg border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-50"><Pencil className="h-3.5 w-3.5" /></button>}
                      {canDelete && <button onClick={() => removeDef(d)} className="rounded-lg border border-red-200 p-1.5 text-red-600 hover:bg-red-50"><Trash2 className="h-3.5 w-3.5" /></button>}
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-[12px] text-slate-500">
                    <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1 font-medium"><GitBranch className="h-3.5 w-3.5" /> {d.stageCount ?? 0} stages</span>
                    <span className="rounded-md bg-indigo-50 px-2 py-1 font-medium text-indigo-600">{d.subjectType}</span>
                    <span className="rounded-md bg-slate-100 px-2 py-1 font-mono text-[11px]">{d.code}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )
      ) : (
        instances.length === 0 ? (
          <Card><CardContent className="py-16 text-center">
            <Play className="mx-auto h-10 w-10 text-slate-300" />
            <p className="mt-3 font-semibold text-slate-700">No instances</p>
            <p className="text-sm text-slate-500">Nothing has run through a workflow yet.</p>
          </CardContent></Card>
        ) : (
          <div className="space-y-2">
            {instances.map((i) => (
              <Link key={i.id} href={`/admin/dashboard/workflows/instances/${i.id}`}>
                <Card className="rounded-xl border-slate-200 transition hover:border-slate-300 hover:shadow-sm">
                  <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <StatusIcon status={i.status} />
                        <p className="truncate font-semibold text-slate-900">{i.subjectLabel || i.subjectId}</p>
                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${INSTANCE_STATUS_STYLE[i.status]}`}>{i.status}</span>
                      </div>
                      <p className="mt-1 text-[12px] text-slate-500">
                        {i.name} · {i.subjectType}
                        {i.status === 'ACTIVE' && <> · at stage {i.currentStageOrder}</>}
                      </p>
                    </div>
                    <p className="flex items-center gap-1 text-[12px] text-slate-400"><Clock className="h-3 w-3" /> {new Date(i.updatedAt).toLocaleString()}</p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )
      )}

      {starting && (
        <StartInstanceModal
          definitions={defs.filter((d) => d.isActive)}
          onClose={() => setStarting(false)}
          onStarted={() => { setStarting(false); setTab('instances'); load(); }}
        />
      )}
    </div>
  );
}

function StartInstanceModal({ definitions, onClose, onStarted }: {
  definitions: WorkflowDefinition[]; onClose: () => void; onStarted: () => void;
}) {
  const [definitionId, setDefinitionId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [subjectLabel, setSubjectLabel] = useState('');
  const [busy, setBusy] = useState(false);
  const def = definitions.find((d) => d.id === definitionId);

  const start = async () => {
    if (!definitionId) { showErrorToast('Required', 'Pick a workflow.'); return; }
    if (!subjectId.trim()) { showErrorToast('Required', 'Enter the subject ID this flow is about.'); return; }
    try {
      setBusy(true);
      await workflowService.startInstance({ definitionId, subjectType: def?.subjectType, subjectId: subjectId.trim(), subjectLabel: subjectLabel.trim() || undefined });
      showSuccessToast('Started', 'Workflow started.');
      onStarted();
    } catch (e: any) { showErrorToast('Failed', e?.response?.data?.message || 'Could not start.'); }
    finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 p-4">
          <h3 className="text-base font-bold text-slate-900">Start a workflow</h3>
          <button onClick={onClose} className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100"><X className="h-5 w-5" /></button>
        </div>
        <div className="space-y-3 p-4">
          <div>
            <label className="mb-1 block text-[13px] font-semibold text-slate-700">Workflow</label>
            <Dropdown value={definitionId} onChange={(v) => setDefinitionId(v as string)}
              options={[{ value: '', label: 'Select a workflow' }, ...definitions.map((d) => ({ value: d.id, label: `${d.name} (${d.subjectType})` }))]} buttonClassName="py-2 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-[13px] font-semibold text-slate-700">Subject ID {def && <span className="font-normal text-slate-400">— the {def.subjectType.toLowerCase()} record id</span>}</label>
            <input value={subjectId} onChange={(e) => setSubjectId(e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#e01a1b] focus:ring-2 focus:ring-[#e01a1b]/15" placeholder="e.g. the vendor's id" />
          </div>
          <div>
            <label className="mb-1 block text-[13px] font-semibold text-slate-700">Label <span className="font-normal text-slate-400">(shown in inbox/timeline)</span></label>
            <input value={subjectLabel} onChange={(e) => setSubjectLabel(e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#e01a1b] focus:ring-2 focus:ring-[#e01a1b]/15" placeholder="e.g. Acme Traders" />
          </div>
          <div className="flex gap-2 pt-1">
            <button onClick={onClose} className="flex-1 rounded-lg border border-slate-200 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancel</button>
            <button onClick={start} disabled={busy} className="flex-1 rounded-lg bg-[#e01a1b] py-2 text-sm font-semibold text-white hover:bg-[#c41617] disabled:opacity-60">{busy ? 'Starting…' : 'Start'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function OverviewPanel({ stats, defs }: { stats: WorkflowStats | null; defs: WorkflowDefinition[] }) {
  if (!stats) return <div className="py-16 text-center text-slate-400">No stats available.</div>;
  const nameByCode = new Map(defs.map((d) => [d.code, d.name]));
  const cards = [
    { label: 'Active', value: stats.instances.active, icon: <Play className="h-5 w-5" />, tone: 'bg-blue-50 text-blue-600' },
    { label: 'Completed', value: stats.instances.completed, icon: <CheckCircle2 className="h-5 w-5" />, tone: 'bg-green-50 text-green-600' },
    { label: 'Rejected', value: stats.instances.rejected, icon: <XCircle className="h-5 w-5" />, tone: 'bg-red-50 text-red-600' },
    { label: 'Pending tasks', value: stats.tasks.pending, icon: <Clock className="h-5 w-5" />, tone: 'bg-slate-100 text-slate-600' },
    { label: 'Overdue', value: stats.tasks.overdue, icon: <AlertTriangle className="h-5 w-5" />, tone: 'bg-amber-50 text-amber-600' },
    { label: 'Escalated', value: stats.tasks.escalated, icon: <TrendingUp className="h-5 w-5" />, tone: 'bg-orange-50 text-orange-600' },
  ];
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {cards.map((c) => (
          <Card key={c.label} className="rounded-2xl border-slate-200">
            <CardContent className="p-4">
              <span className={`inline-grid h-9 w-9 place-items-center rounded-lg ${c.tone}`}>{c.icon}</span>
              <p className="mt-2 text-2xl font-bold text-slate-900">{c.value}</p>
              <p className="text-[12px] text-slate-500">{c.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="rounded-2xl border-slate-200">
        <CardContent className="p-4">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500">Per workflow</h2>
          {stats.perWorkflow.length === 0 ? (
            <p className="text-sm text-slate-400">No instances yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-left text-[12px] uppercase text-slate-400">
                    <th className="py-2 pr-4 font-semibold">Workflow</th>
                    <th className="py-2 pr-4 font-semibold">Active</th>
                    <th className="py-2 pr-4 font-semibold">Completed</th>
                    <th className="py-2 pr-4 font-semibold">Rejected</th>
                    <th className="py-2 font-semibold">Cancelled</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.perWorkflow.map((w) => (
                    <tr key={w.code} className="border-b border-slate-50">
                      <td className="py-2 pr-4 font-medium text-slate-800">{nameByCode.get(w.code) || w.code}</td>
                      <td className="py-2 pr-4 text-blue-600">{w.ACTIVE}</td>
                      <td className="py-2 pr-4 text-green-600">{w.COMPLETED}</td>
                      <td className="py-2 pr-4 text-red-600">{w.REJECTED}</td>
                      <td className="py-2 text-slate-400">{w.CANCELLED}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatusIcon({ status }: { status: WorkflowInstance['status'] }) {
  if (status === 'COMPLETED') return <CheckCircle2 className="h-4 w-4 text-green-600" />;
  if (status === 'REJECTED') return <XCircle className="h-4 w-4 text-red-600" />;
  if (status === 'CANCELLED') return <Ban className="h-4 w-4 text-slate-400" />;
  return <Play className="h-4 w-4 text-blue-600" />;
}
