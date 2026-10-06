'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/UI/Card';
import { Button } from '@/components/UI/Button';
import Dropdown from '@/components/UI/Dropdown';
import {
  Building2, Users, Plus, Pencil, Trash2, X, Loader2, UserCog, Crown, ShieldCheck,
} from 'lucide-react';
import { hasPermission } from '@/lib/auth';
import { showSuccessToast, showErrorToast } from '@/lib/toast-utils';
import { organizationService, type OrgTree, type OrgDepartment, type OrgTeam, type OrgMember } from '@/services/organizationService';
import { roleService, type Role } from '@/services/roleService';
import { userManagementService } from '@/services/userManagementService';

/** Lightweight person option used by the pickers. */
interface StaffOpt { id: string; name: string; email: string }

export default function OrganizationManagement() {
  const [tree, setTree] = useState<OrgTree | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [staff, setStaff] = useState<StaffOpt[]>([]);
  const [loading, setLoading] = useState(true);

  const [deptModal, setDeptModal] = useState<{ mode: 'create' | 'edit'; dept?: OrgDepartment } | null>(null);
  const [teamModal, setTeamModal] = useState<{ mode: 'create' | 'edit'; departmentId: string; team?: OrgTeam } | null>(null);
  const [placeOpen, setPlaceOpen] = useState(false);

  const canCreate = hasPermission('organization:create');
  const canEdit = hasPermission('organization:edit') || hasPermission('organization:assign_roles');
  const canDelete = hasPermission('organization:delete');

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [t, r, s] = await Promise.all([
        organizationService.getTree(),
        roleService.getRoles().catch(() => ({ data: [] as Role[] })),
        userManagementService.getStaff().catch(() => []),
      ]);
      setTree(t.data);
      setRoles(r.data || []);
      setStaff((s || []).map((x) => ({
        id: x.id,
        name: `${x.firstName || ''} ${x.lastName || ''}`.trim() || x.email,
        email: x.email,
      })));
    } catch {
      showErrorToast('Failed', 'Could not load the organization structure.');
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const removeDept = async (d: OrgDepartment) => {
    if (!window.confirm(`Delete department "${d.name}"? This can't be undone.`)) return;
    try { await organizationService.deleteDepartment(d.id); showSuccessToast('Deleted', 'Department removed.'); load(); }
    catch (e: any) { showErrorToast('Cannot delete', e?.response?.data?.message || 'Failed to delete.'); }
  };
  const removeTeam = async (t: OrgTeam) => {
    if (!window.confirm(`Delete team "${t.name}"?`)) return;
    try { await organizationService.deleteTeam(t.id); showSuccessToast('Deleted', 'Team removed.'); load(); }
    catch (e: any) { showErrorToast('Cannot delete', e?.response?.data?.message || 'Failed to delete.'); }
  };

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-[#e01a1b]/10 text-[#e01a1b]"><Building2 className="h-5 w-5" /></span>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Organization</h1>
            <p className="text-sm text-slate-500">Departments, teams, reporting lines and who does what.</p>
          </div>
        </div>
        <div className="flex gap-2">
          {canEdit && <Button variant="outline" onClick={() => setPlaceOpen(true)}><UserCog className="mr-1.5 h-4 w-4" /> Manage People</Button>}
          {canCreate && <Button onClick={() => setDeptModal({ mode: 'create' })}><Plus className="mr-1.5 h-4 w-4" /> Add Department</Button>}
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center text-slate-400"><Loader2 className="mx-auto h-6 w-6 animate-spin" /></div>
      ) : !tree || tree.departments.length === 0 ? (
        <Card><CardContent className="py-16 text-center">
          <Building2 className="mx-auto h-10 w-10 text-slate-300" />
          <p className="mt-3 font-semibold text-slate-700">No departments yet</p>
          <p className="text-sm text-slate-500">Create your first department to start building the org structure.</p>
        </CardContent></Card>
      ) : (
        <div className="space-y-5">
          {tree.departments.map((d) => (
            <Card key={d.id} className="overflow-hidden rounded-2xl border border-slate-200/80 shadow-xs">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-5 py-4">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-indigo-50 text-indigo-600 ring-1 ring-indigo-100"><Building2 className="h-5 w-5" /></span>
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 font-semibold text-slate-900">
                      <span className="truncate">{d.name}</span>
                      {d.code && <span className="shrink-0 rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">{d.code}</span>}
                    </p>
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[12px] text-slate-500">
                      <span className="inline-flex items-center gap-1">
                        <Crown className="h-3.5 w-3.5 text-amber-500" />
                        {d.head?.name ? <>Head: <span className="font-medium text-slate-700">{d.head.name}</span></> : <span className="text-slate-400">No head assigned</span>}
                      </span>
                      <span className="text-slate-300">·</span>
                      <span>{d.teams.length} team{d.teams.length === 1 ? '' : 's'}</span>
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  {canCreate && <button onClick={() => setTeamModal({ mode: 'create', departmentId: d.id })} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[12px] font-semibold text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50"><Plus className="h-3.5 w-3.5" />Team</button>}
                  {canEdit && <button title="Edit department" onClick={() => setDeptModal({ mode: 'edit', dept: d })} className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-500 transition-colors hover:text-slate-800 hover:bg-slate-50"><Pencil className="h-3.5 w-3.5" /></button>}
                  {canDelete && <button title="Delete department" onClick={() => removeDept(d)} className="rounded-lg border border-red-200 bg-white p-1.5 text-red-500 transition-colors hover:text-red-700 hover:bg-red-50"><Trash2 className="h-3.5 w-3.5" /></button>}
                </div>
              </div>

              <CardContent className="space-y-3 p-4">
                {d.teams.length === 0 && d.unassignedMembers.length === 0 && (
                  <p className="rounded-xl border border-dashed border-slate-200 py-6 text-center text-[13px] text-slate-400">No teams or members yet.</p>
                )}
                {d.teams.map((t) => (
                  <div key={t.id} className="rounded-xl border border-slate-200/70 bg-slate-50/50 p-3.5 transition-colors hover:border-slate-300">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-blue-50 text-blue-600"><Users className="h-3.5 w-3.5" /></span>
                        <span className="truncate text-sm font-semibold text-slate-800">{t.name}</span>
                        <span className="shrink-0 text-[11px] font-medium text-slate-400">Lead: {t.lead?.name || 'Unassigned'}</span>
                      </div>
                      <div className="flex shrink-0 gap-1.5">
                        {canEdit && <button title="Edit team" onClick={() => setTeamModal({ mode: 'edit', departmentId: d.id, team: t })} className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-500 transition-colors hover:text-slate-800 hover:bg-slate-50"><Pencil className="h-3.5 w-3.5" /></button>}
                        {canDelete && <button title="Delete team" onClick={() => removeTeam(t)} className="rounded-lg border border-red-200 bg-white p-1.5 text-red-500 transition-colors hover:text-red-700 hover:bg-red-50"><Trash2 className="h-3.5 w-3.5" /></button>}
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-1.5 border-t border-slate-200/60 pt-3">
                      {t.members.length === 0 ? <span className="text-[12px] italic text-slate-400">No members yet</span>
                        : t.members.map((m) => <MemberChip key={m.id} m={m} />)}
                    </div>
                  </div>
                ))}
                {d.unassignedMembers.length > 0 && (
                  <div className="rounded-xl bg-slate-50/60 p-3">
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Department members · no team</p>
                    <div className="flex flex-wrap gap-1.5">{d.unassignedMembers.map((m) => <MemberChip key={m.id} m={m} />)}</div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}

          {tree.unassigned.length > 0 && (
            <Card className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/40 shadow-none">
              <CardContent className="p-4">
                <p className="mb-2.5 flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-wide text-slate-400">
                  <UserCog className="h-3.5 w-3.5" /> Not in any department
                  <span className="rounded-full bg-slate-200 px-1.5 text-[11px] font-bold text-slate-500">{tree.unassigned.length}</span>
                </p>
                <div className="flex flex-wrap gap-1.5">{tree.unassigned.map((m) => <MemberChip key={m.id} m={m} />)}</div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {deptModal && <DepartmentModal m={deptModal} staff={staff} onClose={() => setDeptModal(null)} onSaved={() => { setDeptModal(null); load(); }} />}
      {teamModal && <TeamModal m={teamModal} staff={staff} onClose={() => setTeamModal(null)} onSaved={() => { setTeamModal(null); load(); }} />}
      {placeOpen && <PlacePeopleModal tree={tree} roles={roles} staff={staff} onClose={() => setPlaceOpen(false)} onSaved={load} />}
    </div>
  );
}

function MemberChip({ m }: { m: OrgMember }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white py-1 pl-1 pr-2 text-[12px] font-medium text-slate-700 shadow-xs">
      <span className="grid h-6 w-6 place-items-center rounded-full bg-gradient-to-br from-[#e01a1b] to-[#ff8a3d] text-[10px] font-bold text-white">{(m.name || '?').charAt(0).toUpperCase()}</span>
      <span className="truncate max-w-[160px]">{m.name}</span>
      {m.roleName && <span className="rounded-full bg-[#e01a1b]/10 px-1.5 py-0.5 text-[10px] font-semibold text-[#c41617]">{m.roleName}</span>}
    </span>
  );
}

const inputCls = 'w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#e01a1b] focus:ring-2 focus:ring-[#e01a1b]/15';

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 p-4">
          <h3 className="text-base font-bold text-slate-900">{title}</h3>
          <button onClick={onClose} className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100"><X className="h-5 w-5" /></button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}

function DepartmentModal({ m, staff, onClose, onSaved }: { m: { mode: 'create' | 'edit'; dept?: OrgDepartment }; staff: StaffOpt[]; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(m.dept?.name || '');
  const [code, setCode] = useState(m.dept?.code || '');
  const [description, setDescription] = useState(m.dept?.description || '');
  const [headId, setHeadId] = useState(m.dept?.headId || '');
  const [busy, setBusy] = useState(false);
  const save = async () => {
    if (!name.trim()) { showErrorToast('Required', 'Department name is required.'); return; }
    try {
      setBusy(true);
      const body = { name: name.trim(), code: code.trim() || undefined, description: description.trim() || undefined, headId: headId || undefined };
      if (m.mode === 'create') await organizationService.createDepartment(body);
      else await organizationService.updateDepartment(m.dept!.id, { ...body, headId: headId || null });
      showSuccessToast('Saved', 'Department saved.'); onSaved();
    } catch (e: any) { showErrorToast('Failed', e?.response?.data?.message || 'Could not save.'); }
    finally { setBusy(false); }
  };
  return (
    <Modal title={m.mode === 'create' ? 'Add Department' : 'Edit Department'} onClose={onClose}>
      <div className="space-y-3">
        <div><label className="mb-1 block text-[13px] font-semibold text-slate-700">Name</label><input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} placeholder="e.g. Vendor Management" /></div>
        <div><label className="mb-1 block text-[13px] font-semibold text-slate-700">Code <span className="font-normal text-slate-400">(optional)</span></label><input value={code} onChange={(e) => setCode(e.target.value)} className={inputCls} placeholder="e.g. vendor_mgmt" /></div>
        <div><label className="mb-1 block text-[13px] font-semibold text-slate-700">Description <span className="font-normal text-slate-400">(optional)</span></label><textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className={inputCls} /></div>
        <div>
          <label className="mb-1 block text-[13px] font-semibold text-slate-700">Head / Director</label>
          <Dropdown value={headId} onChange={(v) => setHeadId(v as string)} options={[{ value: '', label: 'Unassigned' }, ...staff.map((s) => ({ value: s.id, label: s.name }))]} buttonClassName="py-2 text-sm" />
        </div>
        <div className="flex gap-2 pt-1">
          <button onClick={onClose} className="flex-1 rounded-lg border border-slate-200 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancel</button>
          <button onClick={save} disabled={busy} className="flex-1 rounded-lg bg-[#e01a1b] py-2 text-sm font-semibold text-white hover:bg-[#c41617] disabled:opacity-60">{busy ? 'Saving…' : 'Save'}</button>
        </div>
      </div>
    </Modal>
  );
}

function TeamModal({ m, staff, onClose, onSaved }: { m: { mode: 'create' | 'edit'; departmentId: string; team?: OrgTeam }; staff: StaffOpt[]; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(m.team?.name || '');
  const [leadId, setLeadId] = useState(m.team?.leadId || '');
  const [description, setDescription] = useState(m.team?.description || '');
  const [busy, setBusy] = useState(false);
  const save = async () => {
    if (!name.trim()) { showErrorToast('Required', 'Team name is required.'); return; }
    try {
      setBusy(true);
      if (m.mode === 'create') await organizationService.createTeam({ name: name.trim(), departmentId: m.departmentId, leadId: leadId || undefined, description: description.trim() || undefined });
      else await organizationService.updateTeam(m.team!.id, { name: name.trim(), leadId: leadId || null, description: description.trim() || undefined });
      showSuccessToast('Saved', 'Team saved.'); onSaved();
    } catch (e: any) { showErrorToast('Failed', e?.response?.data?.message || 'Could not save.'); }
    finally { setBusy(false); }
  };
  return (
    <Modal title={m.mode === 'create' ? 'Add Team' : 'Edit Team'} onClose={onClose}>
      <div className="space-y-3">
        <div><label className="mb-1 block text-[13px] font-semibold text-slate-700">Name</label><input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} placeholder="e.g. Onboarding" /></div>
        <div>
          <label className="mb-1 block text-[13px] font-semibold text-slate-700">Team Lead</label>
          <Dropdown value={leadId} onChange={(v) => setLeadId(v as string)} options={[{ value: '', label: 'Unassigned' }, ...staff.map((s) => ({ value: s.id, label: s.name }))]} buttonClassName="py-2 text-sm" />
        </div>
        <div><label className="mb-1 block text-[13px] font-semibold text-slate-700">Description <span className="font-normal text-slate-400">(optional)</span></label><textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className={inputCls} /></div>
        <div className="flex gap-2 pt-1">
          <button onClick={onClose} className="flex-1 rounded-lg border border-slate-200 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancel</button>
          <button onClick={save} disabled={busy} className="flex-1 rounded-lg bg-[#e01a1b] py-2 text-sm font-semibold text-white hover:bg-[#c41617] disabled:opacity-60">{busy ? 'Saving…' : 'Save'}</button>
        </div>
      </div>
    </Modal>
  );
}

// Place a person: pick user → set department/team/manager/role.
function PlacePeopleModal({ tree, roles, staff, onClose, onSaved }: {
  tree: OrgTree | null; roles: Role[]; staff: StaffOpt[]; onClose: () => void; onSaved: () => void;
}) {
  const [adminId, setAdminId] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [teamId, setTeamId] = useState('');
  const [reportsToId, setReportsToId] = useState('');
  const [roleId, setRoleId] = useState('');
  const [busy, setBusy] = useState(false);

  const depts = tree?.departments || [];
  const teams = depts.find((d) => d.id === departmentId)?.teams || [];

  // Pre-fill from the selected person's current placement.
  const onPick = (id: string) => {
    setAdminId(id);
    const m = [...(tree?.unassigned || []), ...depts.flatMap((d) => [...d.unassignedMembers, ...d.teams.flatMap((t) => t.members)])].find((x) => x.id === id);
    setDepartmentId(m?.departmentId || '');
    setTeamId(m?.teamId || '');
    setReportsToId(m?.reportsToId || '');
    setRoleId(m?.roleId || '');
  };

  const save = async () => {
    if (!adminId) { showErrorToast('Required', 'Select a person.'); return; }
    try {
      setBusy(true);
      await organizationService.placeMember(adminId, {
        departmentId: departmentId || null, teamId: teamId || null, reportsToId: reportsToId || null, roleId: roleId || null,
      });
      showSuccessToast('Saved', 'Placement updated.'); onSaved();
    } catch (e: any) { showErrorToast('Failed', e?.response?.data?.message || 'Could not save.'); }
    finally { setBusy(false); }
  };

  return (
    <Modal title="Place a person" onClose={onClose}>
      <div className="space-y-3">
        <div>
          <label className="mb-1 block text-[13px] font-semibold text-slate-700">Person</label>
          <Dropdown value={adminId} onChange={(v) => onPick(v as string)} options={[{ value: '', label: 'Select a staff member' }, ...staff.map((s) => ({ value: s.id, label: `${s.name} · ${s.email}` }))]} buttonClassName="py-2 text-sm" />
        </div>
        <div>
          <label className="mb-1 block text-[13px] font-semibold text-slate-700">Department</label>
          <Dropdown value={departmentId} onChange={(v) => { setDepartmentId(v as string); setTeamId(''); }} options={[{ value: '', label: 'None' }, ...depts.map((d) => ({ value: d.id, label: d.name }))]} buttonClassName="py-2 text-sm" />
        </div>
        <div>
          <label className="mb-1 block text-[13px] font-semibold text-slate-700">Team</label>
          <Dropdown value={teamId} onChange={(v) => setTeamId(v as string)} options={[{ value: '', label: 'None' }, ...teams.map((t) => ({ value: t.id, label: t.name }))]} buttonClassName="py-2 text-sm" disabled={!departmentId} />
        </div>
        <div>
          <label className="mb-1 block text-[13px] font-semibold text-slate-700 flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5 text-slate-400" /> Role (in this department)</label>
          <Dropdown value={roleId} onChange={(v) => setRoleId(v as string)} options={[{ value: '', label: 'Keep current' }, ...roles.map((r) => ({ value: r.id, label: `${r.name}${r.level != null ? ` · L${r.level}` : ''}` }))]} buttonClassName="py-2 text-sm" />
        </div>
        <div>
          <label className="mb-1 block text-[13px] font-semibold text-slate-700">Reports to</label>
          <Dropdown value={reportsToId} onChange={(v) => setReportsToId(v as string)} options={[{ value: '', label: 'None' }, ...staff.filter((s) => s.id !== adminId).map((s) => ({ value: s.id, label: s.name }))]} buttonClassName="py-2 text-sm" />
        </div>
        <div className="flex gap-2 pt-1">
          <button onClick={onClose} className="flex-1 rounded-lg border border-slate-200 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancel</button>
          <button onClick={save} disabled={busy || !adminId} className="flex-1 rounded-lg bg-[#e01a1b] py-2 text-sm font-semibold text-white hover:bg-[#c41617] disabled:opacity-60">{busy ? 'Saving…' : 'Save placement'}</button>
        </div>
      </div>
    </Modal>
  );
}
