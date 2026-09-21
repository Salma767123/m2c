const cron = require('node-cron');
const { prisma } = require('../config/database');
const {
  createNotificationForRole,
  createNotificationForUsers,
} = require('../controllers/notificationController');

/**
 * Alert on orders a vendor hasn't accepted within the 6-hour window.
 *
 * A shipment is created ORDER_CREATED with acceptanceDeadline = createdAt + 6h.
 * Once that deadline passes while the shipment is still unaccepted, we notify BOTH
 * the admins and the vendor — once per shipment (acceptanceOverdueNotifiedAt
 * dedupes, so a repeated sweep never re-alerts).
 *
 * Exported separately from the scheduler so Vercel Cron can trigger it too
 * (GET /api/jobs/vendor-acceptance-sweep) — node-cron only fires on a
 * long-running server, which Vercel serverless is not.
 *
 * @returns {Promise<{overdue: number, notified: number}>}
 */
async function runVendorAcceptanceSweep() {
  const now = new Date();

  const overdue = await prisma.vendorShipment.findMany({
    where: {
      status: 'ORDER_CREATED',
      acceptanceDeadline: { lt: now, not: null },
      acceptedAt: null,
      acceptanceOverdueNotifiedAt: null,
    },
    select: {
      id: true,
      orderId: true,
      vendorId: true,
      vendorName: true,
      order: { select: { orderId: true } },
    },
  });

  if (overdue.length === 0) {
    console.log('[Cron] No orders overdue for vendor acceptance.');
    return { overdue: 0, notified: 0 };
  }

  let notified = 0;
  for (const s of overdue) {
    const orderNo = s.order?.orderId || '';

    // Admins — so they can chase the vendor or reassign.
    await createNotificationForRole({
      role: 'ADMIN',
      type: 'VENDOR_ACCEPTANCE_OVERDUE',
      title: 'Order Not Accepted in Time',
      message: `Order #${orderNo} — ${s.vendorName} did not accept within 6 hours.`,
      data: { orderId: s.orderId, shipmentId: s.id, screen: 'vendor-to-hub' },
    });

    // The vendor who let it lapse.
    await createNotificationForUsers({
      userIds: [s.vendorId],
      role: 'VENDOR',
      type: 'VENDOR_ACCEPTANCE_OVERDUE',
      title: 'Please Accept Your Order',
      message: `Order #${orderNo} is still awaiting your acceptance — the 6-hour window has passed. Please accept it as soon as possible.`,
      data: { orderId: s.orderId, shipmentId: s.id, screen: 'orders' },
    });

    // Mark it so the next sweep doesn't re-alert.
    await prisma.vendorShipment.update({
      where: { id: s.id },
      data: { acceptanceOverdueNotifiedAt: now },
    });

    notified += 1;
    console.log(`[Cron] Acceptance-overdue alert sent for order #${orderNo} (${s.vendorName}).`);
  }

  return { overdue: overdue.length, notified };
}

/**
 * Schedule the sweep every 15 minutes (so the alert lands close to the 6h mark).
 * Reliable only on a long-running server; on Vercel the same check runs through
 * Vercel Cron.
 */
function startVendorAcceptanceSweep() {
  cron.schedule('*/15 * * * *', async () => {
    console.log('[Cron] Sweeping for orders overdue on vendor acceptance...');
    try {
      await runVendorAcceptanceSweep();
    } catch (error) {
      console.error('[Cron] Vendor-acceptance sweep failed:', error);
    }
  });

  console.log('[Cron] Vendor-acceptance sweep scheduled — runs every 15 minutes');
}

module.exports = { startVendorAcceptanceSweep, runVendorAcceptanceSweep };
