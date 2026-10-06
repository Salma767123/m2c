'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent } from '@/components/UI/Card';
import { Button } from '@/components/UI/Button';
import Dropdown from '@/components/UI/Dropdown';
import {
  ArrowLeft, Plus, Trash2, ChevronUp, ChevronDown, Loader2, GripVertical,
} from 'lucide-react';
import { showSuccessToast, showErrorToast } from '@/lib/toast-utils';
import {
  workflowService, type WorkflowStage, type AssigneeType, type WorkflowAction, ASSIGNEE_TYPE_LABEL,
} from '@/services/workflowService';
import { roleService, type Role } from '@/services/roleService';
import { organizationService, type OrgDepartment } from '@/services/organizationService';
import { userManagementService } from '@/services/userManagementService';

interface StaffOpt { id: string; name: string }

const SUBJECT_TYPES = ['VENDOR', 'PRODUCT', 'ORDER', 'REFUND', 'RETURN', 'GENERIC'];
const ALL_ACTIONS: WorkflowAction[] = ['APPROVE', 'REJECT', 'ASSIGN', 'SUBMIT', 'REQUEST_CHANGES'];
const ASSIGNEE_TYPES: AssigneeType[] = ['ROLE', 'DEPARTMENT', 'TEAM', 'USER', 'INITIATOR', 'DEPT_HEAD', 'TEAM_LEAD', 'DYNAMIC'];

const inputCls = 'w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#e01a1b] focus:ring-2 focus:ring-[#e01a1b]/15';

const blankStage = (order: number): WorkflowStage => ({
  order, name: '', assigneeType: 'ROLE', actions: ['APPROVE', 'REJECT'],
  onApprove: 'NEXT', onReject: 'REJECT_END', requiresComment: false, allowReassign: true,
});

export default function DefinitionEditor({ definitionId, onClose, onSaved }: {
  definitionId?: string; onClose: () => void; onSaved: () => void;
}) {
  const isEdit = !!definitionId;
  const [loading, setLoading] = useState(isEdit);
  const [busy, setBusy] = useState(false);

  const [meta, setMeta] = useState({ name: '', code: '', description: '', subjectType: 'GENERIC', isActive: true, trigger: 'MANUAL', triggerEvent: '' });
  const [stages, setStages] = useState<WorkflowStage[]>([blankStage(1)]);

  const [roles, setRoles] = useState<Role[]>([]);
  const [depts, setDepts] = useState<OrgDepartment[]>([]);
  const [staff, setStaff] = useState<StaffOpt[]>([]);

  const loadRefs = useCallback(async () => {
    const [r, tree, s] = await Promise.all([
      roleService.getRoles().catch(() => ({ data: [] as Role[] })),
      organizationService.getTree().catch(() => ({ data: { departments: [] as OrgDepartment[], unassigned: [] } })),
      userManagementService.getStaff().catch(() => []),
    ]);
    setRoles(r.data || []);
    setDepts(tree.data?.departments || []);
    setStaff((s || []).map((x) => ({ id: x.id, name: `${x.firstName || ''} ${x.lastName || ''}`.trim() || x.email })));
  }, []);

  useEffect(() => {
    (async () => {
      await loadRefs();
      if (isEdit && definitionId) {
        try {
          const res = await workflowService.getDefinition(definitionId);
          const d = res.data;
          setMeta({ name: d.name, code: d.code, description: d.description || '', subjectType: d.subjectType, isActive: d.isActive, trigger: d.trigger || 'MANUAL', triggerEvent: d.triggerEvent || '' });
          setStages(d.stages && d.stages.length ? d.stages : [blankStage(1)]);
        } catch { showErrorToast('Failed', 'Could not load workflow.'); }
        finally { setLoading(false); }
      }
    })();
  }, [isEdit, definitionId, loadRefs]);

  const patchStage = (idx: number, patch: Partial<WorkflowStage>) =>
    setStages((prev) => prev.map((s, i) => (i === idx ? { ...s, ...patch } : s)));

  const addStage = () => setStages((prev) => [...prev, blankStage(prev.length + 1)]);
  const removeStage = (idx: number) => setStages((prev) => prev.filter((_, i) => i !== idx).map((s, i) => ({ ...s, order: i + 1 })));
  const move = (idx: number, dir: -1 | 1) => setStages((prev) => {
    const j = idx + dir;
    if (j < 0 || j >= prev.length) return prev;
    const next = [...prev];
    [next[idx], next[j]] = [next[j], next[idx]];
    return next.map((s, i) => ({ ...s, order: i + 1 }));
  });

  const toggleAction = (idx: number, a: WorkflowAction) => {
    const cur = stages[idx].actions;
    patchStage(idx, { actions: cur.includes(a) ? cur.filter((x) => x !== a) : [...cur, a] });
  };

  // Route options depend on stage count so "go to stage N" is selectable.
  const routeOptions = (kind: 'approve' | 'reject') => {
    const base = kind === 'approve'
      ? [{ value: 'NEXT', label: 'Go to next stage' }, { value: 'COMPLETE', label: 'Complete (approved)' }]
      : [{ value: 'REJECT_END', label: 'End as rejected' }, { value: 'PREVIOUS', label: 'Back one stage' }];
    const jumps = stages.map((s) => ({ value: `order:${s.order}`, label: `Go to stage ${s.order}${s.name ? ` — ${s.name}` : ''}` }));
    return [...base, ...jumps];
  };

  const validate = () => {
    if (!meta.name.trim()) return 'Workflow name is required.';
    if (!meta.code.trim()) return 'A unique code is required.';
    if (!stages.length) return 'Add at least one stage.';
    for (const s of stages) {
      if (!s.name.trim()) return `Stage ${s.order} needs a name.`;
      if (!s.actions.length) return `Stage ${s.order} needs at least one action.`;
      if (s.assigneeType === 'ROLE' && !s.assigneeRoleId) return `Stage ${s.order}: pick a role.`;
      if (s.assigneeType === 'DEPARTMENT' && !s.assigneeDepartmentId) return `Stage ${s.order}: pick a department.`;
      if (s.assigneeType === 'TEAM' && !s.assigneeTeamId) return `Stage ${s.order}: pick a team.`;
      if (s.assigneeType === 'USER' && !s.assigneeAdminId) return `Stage ${s.order}: pick a person.`;
    }
    return null;
  };

  const save = async () => {
    const err = validate();
    if (err) { showErrorToast('Check the form', err); return; }
    try {
      setBusy(true);
      const body = { ...meta, code: meta.code.trim().toLowerCase().replace(/\s+/g, '_'), stages };
      if (isEdit && definitionId) await workflowService.updateDefinition(definitionId, body);
      else await workflowService.createDefinition(body);
      showSuccessToast('Saved', 'Workflow saved.');
      onSaved();
    } catch (e: any) {
      showErrorToast('Failed', e?.response?.data?.message || 'Could not save.');
    } finally { setBusy(false); }
  };

  if (loading) return <div className="py-20 text-center text-slate-400"><Loader2 className="mx-auto h-6 w-6 animate-spin" /></div>;

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-6 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50"><ArrowLeft className="h-4 w-4" /></button>
          <h1 className="text-xl font-bold text-slate-900">{isEdit ? 'Edit Workflow' : 'New Workflow'}</h1>
        </div>
        <Button onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Save Workflow'}</Button>
      </div>

      {/* Meta */}
      <Card className="mb-4 rounded-2xl border-slate-200">
        <CardContent className="grid gap-3 p-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-[13px] font-semibold text-slate-700">Name</label>
            <input value={meta.name} onChange={(e) => setMeta({ ...meta, name: e.target.value })} className={inputCls} placeholder="e.g. Vendor Onboarding" />
          </div>
          <div>
            <label className="mb-1 block text-[13px] font-semibold text-slate-700">Code <span className="font-normal text-slate-400">(unique)</span></label>
            <input value={meta.code} onChange={(e) => setMeta({ ...meta, code: e.target.value })} className={inputCls} placeholder="vendor_onboarding" disabled={isEdit} />
          </div>
          <div>
            <label className="mb-1 block text-[13px] font-semibold text-slate-700">Applies to</label>
            <Dropdown value={meta.subjectType} onChange={(v) => setMeta({ ...meta, subjectType: v as string })}
              options={SUBJECT_TYPES.map((s) => ({ value: s, label: s }))} buttonClassName="py-2 text-sm" />
          </div>
          <div className="flex items-end gap-2">
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <input type="checkbox" checked={meta.isActive} onChange={(e) => setMeta({ ...meta, isActive: e.target.checked })} className="h-4 w-4 rounded" />
              Active
            </label>
          </div>
          <div>
            <label className="mb-1 block text-[13px] font-semibold text-slate-700">How it starts</label>
            <Dropdown value={meta.trigger} onChange={(v) => setMeta({ ...meta, trigger: v as string })}
              options={[{ value: 'MANUAL', label: 'Manually started' }, { value: 'EVENT', label: 'Auto-start on an event' }]} buttonClassName="py-2 text-sm" />
          </div>
          {meta.trigger === 'EVENT' && (
            <div>
              <label className="mb-1 block text-[13px] font-semibold text-slate-700">Trigger event</label>
              <input value={meta.triggerEvent} onChange={(e) => setMeta({ ...meta, triggerEvent: e.target.value })} className={inputCls} placeholder="e.g. vendor.submitted" />
              <p className="mt-1 text-[12px] text-slate-400">The app fires this event; a matching workflow auto-starts.</p>
            </div>
          )}
          <div className="sm:col-span-2">
            <label className="mb-1 block text-[13px] font-semibold text-slate-700">Description</label>
            <input value={meta.description} onChange={(e) => setMeta({ ...meta, description: e.target.value })} className={inputCls} placeholder="What this workflow is for" />
          </div>
        </CardContent>
      </Card>

      {/* Stages */}
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">Stages ({stages.length})</h2>
        <button onClick={addStage} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-[13px] font-semibold text-slate-700 hover:bg-slate-50"><Plus className="h-3.5 w-3.5" /> Add Stage</button>
      </div>

      <div className="space-y-3">
        {stages.map((s, idx) => {
          const dept = depts.find((d) => d.id === s.assigneeDepartmentId);
          const teamOpts = (dept?.teams || depts.flatMap((d) => d.teams)) || [];
          return (
            <Card key={idx} className="rounded-2xl border-slate-200">
              <CardContent className="p-4">
                <div className="mb-3 flex items-center gap-2">
                  <GripVertical className="h-4 w-4 text-slate-300" />
                  <span className="grid h-7 w-7 place-items-center rounded-full bg-[#e01a1b] text-[13px] font-bold text-white">{s.order}</span>
                  <input value={s.name} onChange={(e) => patchStage(idx, { name: e.target.value })} className={`${inputCls} flex-1`} placeholder="Stage name (e.g. Staff reviews documents)" />
                  <button onClick={() => move(idx, -1)} disabled={idx === 0} className="rounded p-1 text-slate-400 hover:bg-slate-100 disabled:opacity-30"><ChevronUp className="h-4 w-4" /></button>
                  <button onClick={() => move(idx, 1)} disabled={idx === stages.length - 1} className="rounded p-1 text-slate-400 hover:bg-slate-100 disabled:opacity-30"><ChevronDown className="h-4 w-4" /></button>
                  <button onClick={() => removeStage(idx)} className="rounded p-1 text-red-500 hover:bg-red-50"><Trash2 className="h-4 w-4" /></button>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  {/* Assignee */}
                  <div>
                    <label className="mb-1 block text-[12px] font-semibold text-slate-600">Who acts</label>
                    <Dropdown value={s.assigneeType}
                      onChange={(v) => patchStage(idx, { assigneeType: v as AssigneeType, assigneeRoleId: null, assigneeDepartmentId: null, assigneeTeamId: null, assigneeAdminId: null })}
                      options={ASSIGNEE_TYPES.map((a) => ({ value: a, label: ASSIGNEE_TYPE_LABEL[a] }))} buttonClassName="py-2 text-sm" />
                  </div>
                  {/* Assignee target */}
                  <div>
                    {s.assigneeType === 'ROLE' && (
                      <>
                        <label className="mb-1 block text-[12px] font-semibold text-slate-600">Role</label>
                        <Dropdown value={s.assigneeRoleId || ''} onChange={(v) => patchStage(idx, { assigneeRoleId: v as string })}
                          options={[{ value: '', label: 'Select role' }, ...roles.map((r) => ({ value: r.id, label: r.name }))]} buttonClassName="py-2 text-sm" />
                      </>
                    )}
                    {s.assigneeType === 'DEPARTMENT' && (
                      <>
                        <label className="mb-1 block text-[12px] font-semibold text-slate-600">Department</label>
                        <Dropdown value={s.assigneeDepartmentId || ''} onChange={(v) => patchStage(idx, { assigneeDepartmentId: v as string })}
                          options={[{ value: '', label: 'Select department' }, ...depts.map((d) => ({ value: d.id, label: d.name }))]} buttonClassName="py-2 text-sm" />
                      </>
                    )}
                    {s.assigneeType === 'TEAM' && (
                      <>
                        <label className="mb-1 block text-[12px] font-semibold text-slate-600">Team</label>
                        <Dropdown value={s.assigneeTeamId || ''} onChange={(v) => patchStage(idx, { assigneeTeamId: v as string })}
                          options={[{ value: '', label: 'Select team' }, ...teamOpts.map((t) => ({ value: t.id, label: t.name }))]} buttonClassName="py-2 text-sm" />
                      </>
                    )}
                    {s.assigneeType === 'USER' && (
                      <>
                        <label className="mb-1 block text-[12px] font-semibold text-slate-600">Person</label>
                        <Dropdown value={s.assigneeAdminId || ''} onChange={(v) => patchStage(idx, { assigneeAdminId: v as string })}
                          options={[{ value: '', label: 'Select person' }, ...staff.map((x) => ({ value: x.id, label: x.name }))]} buttonClassName="py-2 text-sm" />
                      </>
                    )}
                    {s.assigneeType === 'DYNAMIC' && (
                      <p className="pt-6 text-[12px] text-slate-400">Assigned at runtime by an earlier “Assign” step.</p>
                    )}
                    {['INITIATOR', 'DEPT_HEAD', 'TEAM_LEAD'].includes(s.assigneeType) && (
                      <p className="pt-6 text-[12px] text-slate-400">Resolved automatically from the org structure.</p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="sm:col-span-2">
                    <label className="mb-1 block text-[12px] font-semibold text-slate-600">Allowed actions</label>
                    <div className="flex flex-wrap gap-1.5">
                      {ALL_ACTIONS.map((a) => (
                        <button key={a} onClick={() => toggleAction(idx, a)}
                          className={`rounded-lg border px-2.5 py-1 text-[12px] font-semibold ${s.actions.includes(a) ? 'border-[#e01a1b] bg-[#e01a1b]/10 text-[#e01a1b]' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
                          {a}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Routing */}
                  <div>
                    <label className="mb-1 block text-[12px] font-semibold text-slate-600">On approve / submit →</label>
                    <Dropdown value={s.onApprove} onChange={(v) => patchStage(idx, { onApprove: v as string })} options={routeOptions('approve')} buttonClassName="py-2 text-sm" />
                  </div>
                  <div>
                    <label className="mb-1 block text-[12px] font-semibold text-slate-600">On reject →</label>
                    <Dropdown value={s.onReject} onChange={(v) => patchStage(idx, { onReject: v as string })} options={routeOptions('reject')} buttonClassName="py-2 text-sm" />
                  </div>

                  {/* Options */}
                  <div className="flex flex-wrap items-center gap-4 sm:col-span-2">
                    <label className="flex items-center gap-2 text-[13px] text-slate-600">
                      <input type="checkbox" checked={s.requiresComment} onChange={(e) => patchStage(idx, { requiresComment: e.target.checked })} className="h-4 w-4 rounded" />
                      Require a comment
                    </label>
                    <label className="flex items-center gap-2 text-[13px] text-slate-600">
                      SLA (hours):
                      <input type="number" min={0} value={s.slaHours ?? ''} onChange={(e) => patchStage(idx, { slaHours: e.target.value ? parseInt(e.target.value, 10) : null })}
                        className="w-20 rounded-lg border border-slate-200 px-2 py-1 text-sm" placeholder="—" />
                    </label>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
