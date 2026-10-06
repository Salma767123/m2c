// ============================================================================
// Workflow Engine — generic, data-driven multi-stage approvals.
//
// Nothing about any specific process is hardcoded here. A WorkflowDefinition is
// a template of ordered WorkflowStages; an instance runs a subject (Vendor,
// Product, Order, Refund, …) through those stages. Each stage says WHO acts
// (a role/department/team pool, a specific person, the initiator, or a person
// chosen at runtime), WHAT actions are allowed, and WHERE approve/reject route.
// ============================================================================

const { prisma } = require('../config/database');

const ACTIONS = ['APPROVE', 'REJECT', 'ASSIGN', 'SUBMIT', 'REQUEST_CHANGES'];

// ---- assignee resolution ---------------------------------------------------
// Turn a stage's assignee config into the concrete target fields for a task.
// Pool targets (role/dept/team) stay as pools; specific/dynamic resolve to an admin.
async function resolveAssignee(stage, instance) {
  const base = {
    assigneeType: stage.assigneeType,
    assigneeRoleId: null,
    assigneeDepartmentId: null,
    assigneeTeamId: null,
    assigneeAdminId: null,
  };

  switch (stage.assigneeType) {
    case 'ROLE':
      return { ...base, assigneeRoleId: stage.assigneeRoleId || null };
    case 'DEPARTMENT':
      return { ...base, assigneeDepartmentId: stage.assigneeDepartmentId || null };
    case 'TEAM':
      return { ...base, assigneeTeamId: stage.assigneeTeamId || null };
    case 'USER':
      return { ...base, assigneeAdminId: stage.assigneeAdminId || null };
    case 'INITIATOR':
      return { ...base, assigneeAdminId: instance.initiatedById || null };
    case 'DYNAMIC': {
      // Assignee was chosen by an earlier stage's ASSIGN action.
      const map = instance.dynamicAssignees || {};
      const picked = map[String(stage.order)] || null;
      return { ...base, assigneeAdminId: picked };
    }
    case 'DEPT_HEAD': {
      const dep = instance.initiatedById
        ? await prisma.admin.findUnique({ where: { id: instance.initiatedById } }).catch(() => null)
        : null;
      let headId = null;
      if (dep?.departmentId) {
        const d = await prisma.department.findUnique({ where: { id: dep.departmentId } }).catch(() => null);
        headId = d?.headId || null;
      }
      return { ...base, assigneeAdminId: headId };
    }
    case 'TEAM_LEAD': {
      const usr = instance.initiatedById
        ? await prisma.admin.findUnique({ where: { id: instance.initiatedById } }).catch(() => null)
        : null;
      let leadId = null;
      if (usr?.teamId) {
        const t = await prisma.team.findUnique({ where: { id: usr.teamId } }).catch(() => null);
        leadId = t?.leadId || null;
      }
      return { ...base, assigneeAdminId: leadId };
    }
    default:
      return base;
  }
}

// ---- routing ---------------------------------------------------------------
// Given a route directive, return { terminal } or { order } of the next stage.
//   NEXT       -> current order + 1 (COMPLETE/REJECT if none, per direction)
//   COMPLETE   -> finish successfully
//   PREVIOUS   -> current order - 1
//   REJECT_END -> finish as rejected
//   order:N    -> jump to stage N
function resolveRoute(directive, currentOrder, direction) {
  const d = (directive || '').trim();
  if (d === 'COMPLETE') return { terminal: 'COMPLETED' };
  if (d === 'REJECT_END') return { terminal: 'REJECTED' };
  if (d === 'PREVIOUS') return { order: Math.max(1, currentOrder - 1) };
  if (d === 'NEXT') return { order: currentOrder + 1 };
  const m = d.match(/^order:(\d+)$/i);
  if (m) return { order: parseInt(m[1], 10) };
  // Fallback: approve advances, reject ends.
  return direction === 'approve' ? { order: currentOrder + 1 } : { terminal: 'REJECTED' };
}

// ---- task creation ---------------------------------------------------------
async function createTaskForStage(stage, instance, db) {
  const resolved = await resolveAssignee(stage, instance);
  return db.workflowTask.create({
    data: {
      instanceId: instance.id,
      definitionId: instance.definitionId,
      stageId: stage.id,
      stageName: stage.name,
      stageOrder: stage.order,
      ...resolved,
      actions: Array.isArray(stage.actions) && stage.actions.length ? stage.actions : ['APPROVE', 'REJECT'],
      subjectType: instance.subjectType,
      subjectId: instance.subjectId,
      subjectLabel: instance.subjectLabel,
      status: 'PENDING',
      dueAt: stage.slaHours ? new Date(Date.now() + stage.slaHours * 3600 * 1000) : null,
    },
  });
}

async function logHistory(db, entry) {
  return db.workflowHistory.create({ data: entry });
}

// ---- start -----------------------------------------------------------------
// Begin a workflow for a subject. Idempotent guard: won't start a second ACTIVE
// instance of the same definition for the same subject.
async function startWorkflow({
  definitionCode, definitionId, subjectType, subjectId, subjectLabel,
  initiatedById, initiatedByName, data, tx,
}) {
  const db = tx || prisma;

  const def = definitionId
    ? await db.workflowDefinition.findUnique({ where: { id: definitionId } })
    : await db.workflowDefinition.findUnique({ where: { code: definitionCode } });
  if (!def) throw new Error(`Workflow definition not found: ${definitionCode || definitionId}`);
  if (!def.isActive) throw new Error(`Workflow "${def.code}" is inactive`);

  const existing = await db.workflowInstance.findFirst({
    where: { definitionId: def.id, subjectId, status: 'ACTIVE' },
  });
  if (existing) return existing; // already running

  const stages = await db.workflowStage.findMany({
    where: { definitionId: def.id },
    orderBy: { order: 'asc' },
  });
  if (stages.length === 0) throw new Error(`Workflow "${def.code}" has no stages`);

  const first = stages[0];
  const instance = await db.workflowInstance.create({
    data: {
      definitionId: def.id,
      definitionCode: def.code,
      name: def.name,
      subjectType: subjectType || def.subjectType,
      subjectId,
      subjectLabel: subjectLabel || null,
      status: 'ACTIVE',
      currentStageId: first.id,
      currentStageOrder: first.order,
      initiatedById: initiatedById || null,
      initiatedByName: initiatedByName || null,
      dynamicAssignees: {},
      data: data || undefined,
    },
  });

  await createTaskForStage(first, instance, db);
  await logHistory(db, {
    instanceId: instance.id,
    stageId: first.id, stageName: first.name, stageOrder: first.order,
    action: 'STARTED', actorId: initiatedById || null, actorName: initiatedByName || null,
    toStageOrder: first.order,
  });

  return instance;
}

// ---- act on a task ---------------------------------------------------------
// action: APPROVE | REJECT | ASSIGN | SUBMIT | REQUEST_CHANGES
// assignTo: for ASSIGN — the adminId to place into the DYNAMIC target stage.
async function actOnTask({ taskId, action, actor, comment, assignTo }) {
  if (!ACTIONS.includes(action)) throw new Error(`Unknown action: ${action}`);

  return prisma.$transaction(async (db) => {
    const task = await db.workflowTask.findUnique({ where: { id: taskId } });
    if (!task) throw new Error('Task not found');
    if (task.status !== 'PENDING') throw new Error('Task already actioned');
    if (!task.actions.includes(action)) throw new Error(`Action "${action}" not allowed at this stage`);

    const instance = await db.workflowInstance.findUnique({ where: { id: task.instanceId } });
    if (!instance || instance.status !== 'ACTIVE') throw new Error('Workflow is not active');

    const stage = await db.workflowStage.findUnique({ where: { id: task.stageId } });
    if (stage?.requiresComment && !String(comment || '').trim()) {
      throw new Error('A comment is required for this stage');
    }

    // Close this task.
    await db.workflowTask.update({
      where: { id: task.id },
      data: {
        status: 'DONE', actionTaken: action,
        actedById: actor?.id || null, actedByName: actor?.name || null,
        comment: comment || null, actedAt: new Date(),
      },
    });

    // ASSIGN records who handles a later DYNAMIC stage, then advances forward.
    let instancePatch = {};
    if (action === 'ASSIGN') {
      if (!assignTo) throw new Error('ASSIGN requires a person to assign to');
      const targetOrder = stage?.assignedByStageOrder
        // stage config may name which future stage this ASSIGN fills; else the next stage
        || (stage ? stage.order + 1 : task.stageOrder + 1);
      const map = { ...(instance.dynamicAssignees || {}), [String(targetOrder)]: assignTo };
      instancePatch.dynamicAssignees = map;
      instance.dynamicAssignees = map; // keep local copy fresh for resolveAssignee
    }

    const direction = (action === 'REJECT' || action === 'REQUEST_CHANGES') ? 'reject' : 'approve';
    const directive = direction === 'approve' ? (stage?.onApprove || 'NEXT') : (stage?.onReject || 'REJECT_END');
    const route = resolveRoute(directive, task.stageOrder, direction);

    await logHistory(db, {
      instanceId: instance.id,
      stageId: task.stageId, stageName: task.stageName, stageOrder: task.stageOrder,
      action, actorId: actor?.id || null, actorName: actor?.name || null,
      comment: comment || null,
      fromStageOrder: task.stageOrder,
      toStageOrder: route.order || null,
      meta: action === 'ASSIGN' ? { assignedTo: assignTo } : undefined,
    });

    // Terminal outcomes.
    if (route.terminal) {
      const updated = await db.workflowInstance.update({
        where: { id: instance.id },
        data: {
          ...instancePatch,
          status: route.terminal,
          currentStageId: null,
          completedAt: new Date(),
        },
      });
      await logHistory(db, {
        instanceId: instance.id, action: route.terminal === 'COMPLETED' ? 'COMPLETED' : 'REJECTED',
        actorId: actor?.id || null, actorName: actor?.name || null,
      });
      return { instance: updated, task, outcome: route.terminal };
    }

    // Move to the next stage (by order). If it doesn't exist, complete/reject.
    const nextStage = await db.workflowStage.findFirst({
      where: { definitionId: instance.definitionId, order: route.order },
    });
    if (!nextStage) {
      const terminal = direction === 'approve' ? 'COMPLETED' : 'REJECTED';
      const updated = await db.workflowInstance.update({
        where: { id: instance.id },
        data: { ...instancePatch, status: terminal, currentStageId: null, completedAt: new Date() },
      });
      await logHistory(db, {
        instanceId: instance.id, action: terminal,
        actorId: actor?.id || null, actorName: actor?.name || null,
      });
      return { instance: updated, task, outcome: terminal };
    }

    const updated = await db.workflowInstance.update({
      where: { id: instance.id },
      data: { ...instancePatch, currentStageId: nextStage.id, currentStageOrder: nextStage.order },
    });
    // resolveAssignee reads instance.dynamicAssignees; pass the fresh copy.
    const freshInstance = { ...updated, dynamicAssignees: instancePatch.dynamicAssignees || updated.dynamicAssignees };
    const newTask = await createTaskForStage(nextStage, freshInstance, db);

    return { instance: updated, task, outcome: 'ADVANCED', nextStage, newTask };
  });
}

// ---- inbox -----------------------------------------------------------------
// All PENDING tasks an admin may act on: directly assigned, or via a pool they
// belong to (their role(s), department, team).
async function tasksForAdmin(admin) {
  if (!admin?.id) return [];

  // Gather the admin's role ids (single roleId + any scoped RoleAssignments).
  const roleIds = new Set();
  if (admin.roleId) roleIds.add(admin.roleId);
  const assignments = await prisma.roleAssignment.findMany({ where: { adminId: admin.id } }).catch(() => []);
  assignments.forEach((a) => a.roleId && roleIds.add(a.roleId));

  const or = [{ assigneeAdminId: admin.id }];
  if (roleIds.size) or.push({ assigneeRoleId: { in: [...roleIds] } });
  if (admin.departmentId) or.push({ assigneeDepartmentId: admin.departmentId });
  if (admin.teamId) or.push({ assigneeTeamId: admin.teamId });

  // Delegation: also surface tasks directly assigned to anyone currently
  // delegating to me.
  const delegators = await activeDelegatorsFor(admin.id);
  if (delegators.length) or.push({ assigneeAdminId: { in: delegators } });

  return prisma.workflowTask.findMany({
    where: { status: 'PENDING', OR: or },
    orderBy: [{ dueAt: 'asc' }, { createdAt: 'asc' }],
  });
}

// Ids of admins whose direct tasks `toAdminId` may currently act on via an
// active, in-window delegation.
async function activeDelegatorsFor(toAdminId) {
  const now = new Date();
  // NOTE: MongoDB + Prisma mishandles `{ endsAt: null }` where-filters, so we
  // filter the end date in JS instead of in the query.
  const dels = await prisma.workflowDelegation.findMany({
    where: { toAdminId, isActive: true, startsAt: { lte: now } },
    select: { fromAdminId: true, endsAt: true },
  }).catch(() => []);
  return [...new Set(
    dels.filter((d) => !d.endsAt || new Date(d.endsAt) >= now).map((d) => d.fromAdminId)
  )];
}

// ---- escalation ------------------------------------------------------------
// Sweep PENDING tasks past their SLA (dueAt) that haven't been escalated yet,
// and bump each to the assignee's manager (Admin.reportsToId) or department head.
// Returns a summary. Safe to run repeatedly (idempotent via `escalated`).
async function escalateOverdueTasks({ notify } = {}) {
  const now = new Date();
  const overdue = await prisma.workflowTask.findMany({
    where: { status: 'PENDING', escalated: false, dueAt: { not: null, lt: now } },
  });
  let escalated = 0;

  for (const task of overdue) {
    try {
      // Resolve who currently holds it, to find their manager.
      const holderId = task.assigneeAdminId;
      let targetId = null;
      if (holderId) {
        const holder = await prisma.admin.findUnique({ where: { id: holderId } }).catch(() => null);
        targetId = holder?.reportsToId || null;
        if (!targetId && holder?.departmentId) {
          const dept = await prisma.department.findUnique({ where: { id: holder.departmentId } }).catch(() => null);
          targetId = dept?.headId && dept.headId !== holderId ? dept.headId : null;
        }
      }

      await prisma.$transaction(async (db) => {
        await db.workflowTask.update({
          where: { id: task.id },
          data: targetId
            ? {
                assigneeType: 'USER', assigneeAdminId: targetId,
                assigneeRoleId: null, assigneeDepartmentId: null, assigneeTeamId: null,
                escalated: true, escalationLevel: task.escalationLevel + 1,
                originalAssigneeAdminId: task.originalAssigneeAdminId || holderId || null,
                escalatedAt: now,
              }
            : { escalated: true, escalationLevel: task.escalationLevel + 1, escalatedAt: now },
        });
        await db.workflowHistory.create({
          data: {
            instanceId: task.instanceId, stageId: task.stageId, stageName: task.stageName, stageOrder: task.stageOrder,
            action: 'ESCALATED', actorName: 'System (SLA)',
            comment: targetId ? 'SLA breached — escalated to manager.' : 'SLA breached — no manager found; flagged.',
            meta: { from: holderId, to: targetId },
          },
        });
      });

      escalated += 1;
      if (notify) {
        try {
          if (targetId) await notify({ userId: targetId, role: 'ADMIN', type: 'WORKFLOW_ESCALATION', title: 'Escalated task', message: `An overdue task "${task.stageName}" (${task.subjectLabel || task.subjectType}) was escalated to you.`, data: { taskId: task.id, instanceId: task.instanceId } });
          else await notify({ role: 'ADMIN', broadcast: true, type: 'WORKFLOW_ESCALATION', title: 'Overdue task', message: `Task "${task.stageName}" (${task.subjectLabel || task.subjectType}) is overdue and has no manager to escalate to.`, data: { taskId: task.id, instanceId: task.instanceId } });
        } catch { /* non-fatal */ }
      }
    } catch (e) {
      console.error('[escalation] failed for task', task.id, e.message);
    }
  }
  return { checked: overdue.length, escalated };
}

module.exports = {
  ACTIONS,
  startWorkflow,
  actOnTask,
  tasksForAdmin,
  activeDelegatorsFor,
  escalateOverdueTasks,
  resolveAssignee,
  resolveRoute,
};
