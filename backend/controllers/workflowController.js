const { prisma } = require('../config/database');
const engine = require('../utils/workflowEngine');

let createNotification;
try { ({ createNotification } = require('./notificationController')); } catch { createNotification = null; }

const actorFrom = (req) => ({ id: req.user?.id, name: req.user?.name || req.user?.email || 'Admin' });

// Fire a notification to whoever a task now sits with (best-effort).
async function notifyTaskAssignee(task) {
  if (!createNotification) return;
  try {
    const title = 'New approval task';
    const message = `"${task.stageName}" for ${task.subjectLabel || task.subjectType} needs your action.`;
    const data = { taskId: task.id, instanceId: task.instanceId, subjectType: task.subjectType, subjectId: task.subjectId };
    if (task.assigneeAdminId) {
      await createNotification({ userId: task.assigneeAdminId, role: 'ADMIN', type: 'WORKFLOW_TASK', title, message, data });
    }
    // Pool tasks (role/dept/team) are surfaced via the inbox; skip fan-out spam here.
  } catch { /* non-fatal */ }
}

// ============================================================================
// DEFINITIONS (workflow templates + their stages)
// ============================================================================

exports.listDefinitions = async (req, res) => {
  try {
    const { subjectType, isActive } = req.query;
    const where = {};
    if (subjectType) where.subjectType = subjectType;
    if (isActive === 'true') where.isActive = true;
    if (isActive === 'false') where.isActive = false;

    const defs = await prisma.workflowDefinition.findMany({ where, orderBy: { updatedAt: 'desc' } });
    // Attach stage counts.
    const counts = await prisma.workflowStage.groupBy({ by: ['definitionId'], _count: { _all: true } }).catch(() => []);
    const countMap = new Map(counts.map((c) => [c.definitionId, c._count._all]));
    const data = defs.map((d) => ({ ...d, stageCount: countMap.get(d.id) || 0 }));
    res.json({ success: true, data });
  } catch (e) {
    console.error('listDefinitions', e);
    res.status(500).json({ success: false, message: 'Failed to load workflows' });
  }
};

exports.getDefinition = async (req, res) => {
  try {
    const def = await prisma.workflowDefinition.findUnique({ where: { id: req.params.id } });
    if (!def) return res.status(404).json({ success: false, message: 'Workflow not found' });
    const stages = await prisma.workflowStage.findMany({ where: { definitionId: def.id }, orderBy: { order: 'asc' } });
    res.json({ success: true, data: { ...def, stages } });
  } catch (e) {
    console.error('getDefinition', e);
    res.status(500).json({ success: false, message: 'Failed to load workflow' });
  }
};

exports.createDefinition = async (req, res) => {
  try {
    const { name, code, description, subjectType, trigger, triggerEvent, stages } = req.body;
    if (!name || !code || !subjectType) {
      return res.status(400).json({ success: false, message: 'name, code and subjectType are required' });
    }
    const dup = await prisma.workflowDefinition.findUnique({ where: { code } });
    if (dup) return res.status(400).json({ success: false, message: 'A workflow with this code already exists' });

    const actor = actorFrom(req);
    const def = await prisma.workflowDefinition.create({
      data: {
        name, code, description: description || null, subjectType,
        trigger: trigger || 'MANUAL', triggerEvent: triggerEvent || null,
        createdById: actor.id || null, createdByName: actor.name,
      },
    });
    if (Array.isArray(stages) && stages.length) {
      await writeStages(def.id, stages);
    }
    const full = await prisma.workflowStage.findMany({ where: { definitionId: def.id }, orderBy: { order: 'asc' } });
    res.status(201).json({ success: true, data: { ...def, stages: full }, message: 'Workflow created' });
  } catch (e) {
    console.error('createDefinition', e);
    res.status(500).json({ success: false, message: 'Failed to create workflow' });
  }
};

exports.updateDefinition = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, subjectType, isActive, trigger, triggerEvent, stages } = req.body;
    const def = await prisma.workflowDefinition.findUnique({ where: { id } });
    if (!def) return res.status(404).json({ success: false, message: 'Workflow not found' });

    const updated = await prisma.workflowDefinition.update({
      where: { id },
      data: {
        name: name ?? def.name,
        description: description !== undefined ? description : def.description,
        subjectType: subjectType ?? def.subjectType,
        isActive: isActive !== undefined ? !!isActive : def.isActive,
        trigger: trigger ?? def.trigger,
        triggerEvent: triggerEvent !== undefined ? triggerEvent : def.triggerEvent,
      },
    });
    // If stages provided, replace them wholesale (builder saves the full list).
    if (Array.isArray(stages)) {
      await prisma.workflowStage.deleteMany({ where: { definitionId: id } });
      if (stages.length) await writeStages(id, stages);
    }
    const full = await prisma.workflowStage.findMany({ where: { definitionId: id }, orderBy: { order: 'asc' } });
    res.json({ success: true, data: { ...updated, stages: full }, message: 'Workflow updated' });
  } catch (e) {
    console.error('updateDefinition', e);
    res.status(500).json({ success: false, message: 'Failed to update workflow' });
  }
};

exports.deleteDefinition = async (req, res) => {
  try {
    const { id } = req.params;
    const active = await prisma.workflowInstance.count({ where: { definitionId: id, status: 'ACTIVE' } });
    if (active > 0) {
      return res.status(400).json({ success: false, message: `Cannot delete: ${active} instance(s) still running.` });
    }
    await prisma.workflowStage.deleteMany({ where: { definitionId: id } });
    await prisma.workflowDefinition.delete({ where: { id } });
    res.json({ success: true, message: 'Workflow deleted' });
  } catch (e) {
    console.error('deleteDefinition', e);
    res.status(500).json({ success: false, message: 'Failed to delete workflow' });
  }
};

// Normalize + persist a stage list for a definition. Orders are re-sequenced 1..n
// in the array order given, so the builder can just send stages top-to-bottom.
async function writeStages(definitionId, stages) {
  const rows = stages.map((s, i) => ({
    definitionId,
    order: i + 1,
    name: s.name || `Stage ${i + 1}`,
    description: s.description || null,
    assigneeType: s.assigneeType || 'ROLE',
    assigneeRoleId: s.assigneeRoleId || null,
    assigneeDepartmentId: s.assigneeDepartmentId || null,
    assigneeTeamId: s.assigneeTeamId || null,
    assigneeAdminId: s.assigneeAdminId || null,
    assignedByStageOrder: Number.isFinite(Number(s.assignedByStageOrder)) ? Number(s.assignedByStageOrder) : null,
    actions: Array.isArray(s.actions) && s.actions.length ? s.actions : ['APPROVE', 'REJECT'],
    onApprove: s.onApprove || 'NEXT',
    onReject: s.onReject || 'REJECT_END',
    requiresComment: !!s.requiresComment,
    allowReassign: s.allowReassign !== undefined ? !!s.allowReassign : true,
    slaHours: Number.isFinite(Number(s.slaHours)) && Number(s.slaHours) > 0 ? Number(s.slaHours) : null,
  }));
  await prisma.workflowStage.createMany({ data: rows });
}

// ============================================================================
// INSTANCES
// ============================================================================

exports.listInstances = async (req, res) => {
  try {
    const { status, subjectType, definitionId } = req.query;
    const where = {};
    if (status) where.status = status;
    if (subjectType) where.subjectType = subjectType;
    if (definitionId) where.definitionId = definitionId;
    const data = await prisma.workflowInstance.findMany({ where, orderBy: { updatedAt: 'desc' }, take: 200 });
    res.json({ success: true, data });
  } catch (e) {
    console.error('listInstances', e);
    res.status(500).json({ success: false, message: 'Failed to load instances' });
  }
};

exports.getInstance = async (req, res) => {
  try {
    const instance = await prisma.workflowInstance.findUnique({ where: { id: req.params.id } });
    if (!instance) return res.status(404).json({ success: false, message: 'Instance not found' });
    const [stages, tasks, history] = await Promise.all([
      prisma.workflowStage.findMany({ where: { definitionId: instance.definitionId }, orderBy: { order: 'asc' } }),
      prisma.workflowTask.findMany({ where: { instanceId: instance.id }, orderBy: { createdAt: 'asc' } }),
      prisma.workflowHistory.findMany({ where: { instanceId: instance.id }, orderBy: { createdAt: 'asc' } }),
    ]);
    res.json({ success: true, data: { ...instance, stages, tasks, history } });
  } catch (e) {
    console.error('getInstance', e);
    res.status(500).json({ success: false, message: 'Failed to load instance' });
  }
};

exports.startInstance = async (req, res) => {
  try {
    const { definitionCode, definitionId, subjectType, subjectId, subjectLabel, data } = req.body;
    if ((!definitionCode && !definitionId) || !subjectId) {
      return res.status(400).json({ success: false, message: 'definition and subjectId are required' });
    }
    const actor = actorFrom(req);
    const instance = await engine.startWorkflow({
      definitionCode, definitionId, subjectType, subjectId, subjectLabel,
      initiatedById: actor.id, initiatedByName: actor.name, data,
    });
    // Notify the first assignee if it resolved to a specific person.
    const firstTask = await prisma.workflowTask.findFirst({ where: { instanceId: instance.id, status: 'PENDING' }, orderBy: { createdAt: 'asc' } });
    if (firstTask) notifyTaskAssignee(firstTask);
    res.status(201).json({ success: true, data: instance, message: 'Workflow started' });
  } catch (e) {
    console.error('startInstance', e);
    res.status(400).json({ success: false, message: e.message || 'Failed to start workflow' });
  }
};

exports.cancelInstance = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body || {};
    const actor = actorFrom(req);
    const instance = await prisma.workflowInstance.findUnique({ where: { id } });
    if (!instance) return res.status(404).json({ success: false, message: 'Instance not found' });
    if (instance.status !== 'ACTIVE') return res.status(400).json({ success: false, message: 'Instance is not active' });

    await prisma.$transaction(async (db) => {
      await db.workflowTask.updateMany({ where: { instanceId: id, status: 'PENDING' }, data: { status: 'CANCELLED' } });
      await db.workflowInstance.update({ where: { id }, data: { status: 'CANCELLED', currentStageId: null, completedAt: new Date() } });
      await db.workflowHistory.create({
        data: { instanceId: id, action: 'CANCELLED', actorId: actor.id || null, actorName: actor.name, comment: reason || null },
      });
    });
    res.json({ success: true, message: 'Workflow cancelled' });
  } catch (e) {
    console.error('cancelInstance', e);
    res.status(500).json({ success: false, message: 'Failed to cancel workflow' });
  }
};

// ============================================================================
// TASKS (personal inbox + acting)
// ============================================================================

exports.myTasks = async (req, res) => {
  try {
    const tasks = await engine.tasksForAdmin(req.user);
    res.json({ success: true, data: tasks, count: tasks.length });
  } catch (e) {
    console.error('myTasks', e);
    res.status(500).json({ success: false, message: 'Failed to load your tasks' });
  }
};

// Is this admin eligible to act on this pending task?
async function canAct(admin, task) {
  if (task.assigneeAdminId) {
    if (task.assigneeAdminId === admin.id) return true;
    // Delegation: someone covering for the direct assignee may act.
    const delegators = await engine.activeDelegatorsFor(admin.id);
    return delegators.includes(task.assigneeAdminId);
  }
  if (task.assigneeDepartmentId && task.assigneeDepartmentId === admin.departmentId) return true;
  if (task.assigneeTeamId && task.assigneeTeamId === admin.teamId) return true;
  if (task.assigneeRoleId) {
    if (admin.roleId === task.assigneeRoleId) return true;
    const a = await prisma.roleAssignment.findFirst({ where: { adminId: admin.id, roleId: task.assigneeRoleId } });
    return !!a;
  }
  return false;
}

exports.actOnTask = async (req, res) => {
  try {
    const { id } = req.params;
    const { action, comment, assignTo } = req.body;
    const task = await prisma.workflowTask.findUnique({ where: { id } });
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });
    if (task.status !== 'PENDING') return res.status(400).json({ success: false, message: 'Task already actioned' });

    const eligible = await canAct(req.user, task);
    if (!eligible) return res.status(403).json({ success: false, message: 'This task is not assigned to you' });

    const result = await engine.actOnTask({ taskId: id, action, actor: actorFrom(req), comment, assignTo });
    if (result.newTask) notifyTaskAssignee(result.newTask);
    res.json({ success: true, data: result, message: `Task ${action.toLowerCase()}d` });
  } catch (e) {
    console.error('actOnTask', e);
    res.status(400).json({ success: false, message: e.message || 'Failed to action task' });
  }
};

// ============================================================================
// DELEGATION (cover-my-tasks)
// ============================================================================

// Delegations I created (who covers me).
exports.myDelegations = async (req, res) => {
  try {
    const data = await prisma.workflowDelegation.findMany({
      where: { fromAdminId: req.user.id },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data });
  } catch (e) {
    console.error('myDelegations', e);
    res.status(500).json({ success: false, message: 'Failed to load delegations' });
  }
};

exports.createDelegation = async (req, res) => {
  try {
    const { toAdminId, toName, reason, startsAt, endsAt } = req.body;
    if (!toAdminId) return res.status(400).json({ success: false, message: 'Pick who will cover your tasks' });
    if (toAdminId === req.user.id) return res.status(400).json({ success: false, message: 'You cannot delegate to yourself' });

    const del = await prisma.workflowDelegation.create({
      data: {
        fromAdminId: req.user.id, fromName: req.user.name || req.user.email,
        toAdminId, toName: toName || null, reason: reason || null,
        startsAt: startsAt ? new Date(startsAt) : new Date(),
        endsAt: endsAt ? new Date(endsAt) : null,
        isActive: true,
      },
    });
    res.status(201).json({ success: true, data: del, message: 'Delegation created' });
  } catch (e) {
    console.error('createDelegation', e);
    res.status(500).json({ success: false, message: 'Failed to create delegation' });
  }
};

exports.endDelegation = async (req, res) => {
  try {
    const { id } = req.params;
    const del = await prisma.workflowDelegation.findUnique({ where: { id } });
    if (!del) return res.status(404).json({ success: false, message: 'Delegation not found' });
    if (del.fromAdminId !== req.user.id) return res.status(403).json({ success: false, message: 'Not your delegation' });
    await prisma.workflowDelegation.update({ where: { id }, data: { isActive: false, endsAt: new Date() } });
    res.json({ success: true, message: 'Delegation ended' });
  } catch (e) {
    console.error('endDelegation', e);
    res.status(500).json({ success: false, message: 'Failed to end delegation' });
  }
};

// ============================================================================
// DASHBOARD / STATS
// ============================================================================

exports.getStats = async (req, res) => {
  try {
    const now = new Date();
    const [active, completed, rejected, cancelled, pendingTasks, overdueTasks, escalatedTasks, byDef] = await Promise.all([
      prisma.workflowInstance.count({ where: { status: 'ACTIVE' } }),
      prisma.workflowInstance.count({ where: { status: 'COMPLETED' } }),
      prisma.workflowInstance.count({ where: { status: 'REJECTED' } }),
      prisma.workflowInstance.count({ where: { status: 'CANCELLED' } }),
      prisma.workflowTask.count({ where: { status: 'PENDING' } }),
      prisma.workflowTask.count({ where: { status: 'PENDING', dueAt: { not: null, lt: now } } }),
      prisma.workflowTask.count({ where: { status: 'PENDING', escalated: true } }),
      prisma.workflowInstance.groupBy({ by: ['definitionCode', 'status'], _count: { _all: true } }).catch(() => []),
    ]);

    // Per-workflow breakdown keyed by definitionCode.
    const perWorkflow = {};
    for (const row of byDef) {
      const k = row.definitionCode;
      if (!perWorkflow[k]) perWorkflow[k] = { code: k, ACTIVE: 0, COMPLETED: 0, REJECTED: 0, CANCELLED: 0 };
      perWorkflow[k][row.status] = row._count._all;
    }

    res.json({
      success: true,
      data: {
        instances: { active, completed, rejected, cancelled, total: active + completed + rejected + cancelled },
        tasks: { pending: pendingTasks, overdue: overdueTasks, escalated: escalatedTasks },
        perWorkflow: Object.values(perWorkflow),
      },
    });
  } catch (e) {
    console.error('getStats', e);
    res.status(500).json({ success: false, message: 'Failed to load stats' });
  }
};
