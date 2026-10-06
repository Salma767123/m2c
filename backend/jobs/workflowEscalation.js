const cron = require('node-cron');
const engine = require('../utils/workflowEngine');
const {
  createNotification,
  createNotificationForRole,
} = require('../controllers/notificationController');

/**
 * Escalate workflow tasks that have blown their SLA (dueAt in the past) and
 * haven't been escalated yet. The engine bumps each to the assignee's manager
 * (Admin.reportsToId) or department head; this wrapper just supplies the
 * notification sink and logging.
 *
 * Exported separately from the scheduler so Vercel Cron can trigger it too
 * (GET /api/jobs/workflow-escalation).
 *
 * @returns {Promise<{checked:number, escalated:number}>}
 */
async function runWorkflowEscalation() {
  const notify = async ({ userId, role = 'ADMIN', broadcast, type, title, message, data }) => {
    if (broadcast) {
      await createNotificationForRole({ role, type, title, message, data });
    } else if (userId) {
      await createNotification({ userId, role, type, title, message, data });
    }
  };

  const result = await engine.escalateOverdueTasks({ notify });
  if (result.escalated > 0) {
    console.log(`[Cron] Workflow escalation: ${result.escalated}/${result.checked} overdue task(s) escalated.`);
  } else {
    console.log(`[Cron] Workflow escalation: nothing overdue (${result.checked} checked).`);
  }
  return result;
}

/** Schedule the escalation sweep every 15 minutes (long-running server only). */
function startWorkflowEscalation() {
  cron.schedule('*/15 * * * *', async () => {
    try {
      await runWorkflowEscalation();
    } catch (error) {
      console.error('[Cron] Workflow escalation failed:', error);
    }
  });
  console.log('[Cron] Workflow escalation scheduled — runs every 15 minutes');
}

module.exports = { startWorkflowEscalation, runWorkflowEscalation };
