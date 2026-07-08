const cron = require('node-cron');
const { prisma } = require('../config/database');
const { createNotificationForRole } = require('../controllers/notificationController');

/**
 * Check for overdue settlements and notify admins.
 * Only sends one notification per overdue settlement per day.
 *
 * Exported separately from the scheduler so it can also be triggered by
 * Vercel Cron (GET /api/jobs/overdue-settlements) — node-cron only fires on
 * a long-running server, which Vercel serverless is not.
 *
 * @returns {Promise<{checked: number, notified: number}>}
 */
async function checkOverdueSettlements() {
  const now = new Date();

  // Find all pending settlements where dueDate has passed
  const overdueSettlements = await prisma.settlement.findMany({
    where: {
      status: { in: ['Pending', 'Processing'] },
      dueDate: { lt: now, not: null },
    },
    select: {
      id: true,
      settlementNumber: true,
      vendorName: true,
      amount: true,
      dueDate: true,
    },
  });

  if (overdueSettlements.length === 0) {
    console.log('[Cron] No overdue settlements found.');
    return { checked: 0, notified: 0 };
  }

  console.log(`[Cron] Found ${overdueSettlements.length} overdue settlement(s).`);
  let notified = 0;

  for (const settlement of overdueSettlements) {
    // Check if we already sent an overdue notification for this settlement today
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const alreadyNotified = await prisma.notification.findFirst({
      where: {
        type: 'PAYMENT_OVERDUE',
        data: { path: ['settlementId'], equals: settlement.id },
        createdAt: { gte: today },
      },
    });

    if (alreadyNotified) continue;

    const daysOverdue = Math.floor((now.getTime() - new Date(settlement.dueDate).getTime()) / (1000 * 60 * 60 * 24));

    await createNotificationForRole({
      role: 'ADMIN',
      type: 'PAYMENT_OVERDUE',
      title: 'Payment Overdue',
      message: `Settlement ${settlement.settlementNumber} is ${daysOverdue} day(s) overdue — ₹${settlement.amount.toLocaleString('en-IN')} to ${settlement.vendorName}`,
      data: { settlementId: settlement.id },
    });

    notified += 1;
    console.log(`[Cron] Overdue notification sent for ${settlement.settlementNumber} (${daysOverdue} days overdue)`);
  }

  return { checked: overdueSettlements.length, notified };
}

/**
 * Schedule the daily 9:00 AM check via node-cron.
 * Only reliable on a long-running server (local dev / VM); on Vercel the
 * same check is triggered through Vercel Cron instead (see vercel.json).
 */
function startOverdueSettlementCheck() {
  cron.schedule('0 9 * * *', async () => {
    console.log('[Cron] Checking for overdue settlements...');
    try {
      await checkOverdueSettlements();
    } catch (error) {
      console.error('[Cron] Overdue settlement check failed:', error);
    }
  });

  console.log('[Cron] Overdue settlement check scheduled — runs daily at 9:00 AM');
}

module.exports = { startOverdueSettlementCheck, checkOverdueSettlements };
