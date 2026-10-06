// ============================================================================
// Workflow event bus — lets app code fire a domain event and have any matching
// EVENT-triggered workflow definition auto-start, without the caller knowing
// which workflows exist. Fully decoupled: adding/removing a workflow in the DB
// changes behaviour with zero code changes at the call site.
//
// Usage from anywhere in the backend (fire-and-forget, never throws to caller):
//   const { triggerWorkflowEvent } = require('../utils/workflowEvents');
//   triggerWorkflowEvent('vendor.submitted', {
//     subjectType: 'VENDOR', subjectId: vendor.id, subjectLabel: vendor.companyName,
//     initiatedById: actorId, initiatedByName: actorName, data: { ... },
//   });
// ============================================================================

const { prisma } = require('../config/database');
const engine = require('./workflowEngine');

// Start every active workflow whose trigger === 'EVENT' and triggerEvent matches.
// Returns the instances started (may be empty). Safe: swallows and logs errors so
// a workflow misconfiguration never breaks the business action that fired the event.
async function triggerWorkflowEvent(event, ctx = {}) {
  try {
    if (!event) return [];
    const defs = await prisma.workflowDefinition.findMany({
      where: { isActive: true, trigger: 'EVENT', triggerEvent: event },
    });
    if (!defs.length) return [];

    const started = [];
    for (const def of defs) {
      try {
        const instance = await engine.startWorkflow({
          definitionId: def.id,
          subjectType: ctx.subjectType || def.subjectType,
          subjectId: ctx.subjectId,
          subjectLabel: ctx.subjectLabel,
          initiatedById: ctx.initiatedById,
          initiatedByName: ctx.initiatedByName,
          data: ctx.data,
        });
        started.push(instance);
      } catch (e) {
        console.error(`[workflowEvents] failed to start "${def.code}" for ${event}:`, e.message);
      }
    }
    return started;
  } catch (e) {
    console.error(`[workflowEvents] triggerWorkflowEvent("${event}") failed:`, e.message);
    return [];
  }
}

module.exports = { triggerWorkflowEvent };
