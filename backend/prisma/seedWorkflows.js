// Seeds a DEMO "Vendor Onboarding" workflow so the engine can be explored end to end.
// This is just an example — edit or delete it freely in Admin → Workflows.
// Idempotent: re-running replaces the demo definition (only if it has no active runs).
//
//   node prisma/seedWorkflows.js
const { prisma } = require('../config/database');

async function roleIdByName(name) {
  const r = await prisma.role.findFirst({ where: { name } });
  return r?.id || null;
}

async function main() {
  const CODE = 'vendor_onboarding';

  // Resolve a few roles by name (fall back gracefully if a name isn't present).
  const staffRole = (await roleIdByName('Human Resource')) || (await roleIdByName('Manager'));
  const managerRole = (await roleIdByName('Manager')) || staffRole;
  const directorRole = (await roleIdByName('Admin')) || managerRole;

  const existing = await prisma.workflowDefinition.findUnique({ where: { code: CODE } });
  if (existing) {
    const active = await prisma.workflowInstance.count({ where: { definitionId: existing.id, status: 'ACTIVE' } });
    if (active > 0) {
      console.log(`Skipped: "${CODE}" has ${active} active instance(s). Delete them first to reseed.`);
      process.exit(0);
    }
    await prisma.workflowStage.deleteMany({ where: { definitionId: existing.id } });
    await prisma.workflowDefinition.delete({ where: { id: existing.id } });
    console.log('Removed previous demo definition.');
  }

  const def = await prisma.workflowDefinition.create({
    data: {
      name: 'Vendor Onboarding',
      code: CODE,
      description: 'DEMO: multi-stage vendor onboarding approval. Edit the stages to match your real process.',
      subjectType: 'VENDOR',
      isActive: true,
      trigger: 'MANUAL',
      createdByName: 'System (seed)',
    },
  });

  const stages = [
    { order: 1, name: 'Staff reviews documents', assigneeType: 'ROLE', assigneeRoleId: staffRole,
      actions: ['APPROVE', 'REJECT'], onApprove: 'NEXT', onReject: 'REJECT_END', requiresComment: false },
    { order: 2, name: 'Assign a QC checker', assigneeType: 'ROLE', assigneeRoleId: staffRole,
      actions: ['ASSIGN'], onApprove: 'NEXT', onReject: 'REJECT_END', assignedByStageOrder: 3 },
    { order: 3, name: 'QC uploads inspection report', assigneeType: 'DYNAMIC',
      actions: ['SUBMIT', 'REJECT'], onApprove: 'NEXT', onReject: 'order:2', requiresComment: true },
    { order: 4, name: 'Reviewer checks QC report', assigneeType: 'ROLE', assigneeRoleId: staffRole,
      actions: ['APPROVE', 'REJECT'], onApprove: 'NEXT', onReject: 'order:3' },
    { order: 5, name: 'Manager approval', assigneeType: 'ROLE', assigneeRoleId: managerRole,
      actions: ['APPROVE', 'REJECT'], onApprove: 'NEXT', onReject: 'order:1', requiresComment: true },
    { order: 6, name: 'Director final approval', assigneeType: 'ROLE', assigneeRoleId: directorRole,
      actions: ['APPROVE', 'REJECT'], onApprove: 'COMPLETE', onReject: 'REJECT_END', requiresComment: true },
  ];

  await prisma.workflowStage.createMany({
    data: stages.map((s) => ({
      definitionId: def.id,
      order: s.order,
      name: s.name,
      assigneeType: s.assigneeType,
      assigneeRoleId: s.assigneeRoleId || null,
      assignedByStageOrder: s.assignedByStageOrder || null,
      actions: s.actions,
      onApprove: s.onApprove,
      onReject: s.onReject,
      requiresComment: !!s.requiresComment,
      allowReassign: true,
    })),
  });

  console.log(`✅ Seeded demo workflow "${def.name}" (${CODE}) with ${stages.length} stages.`);
  console.log(`   Roles used → staff:${staffRole} manager:${managerRole} director:${directorRole}`);
  process.exit(0);
}

main().catch((e) => { console.error('Seed failed:', e); process.exit(1); });
