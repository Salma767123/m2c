const cron = require('node-cron');
const { prisma } = require('../config/database');
const {
  createNotificationForRole,
  createNotificationForUsers,
} = require('../controllers/notificationController');

// How far ahead counts as "ending soon". An offer/coupon whose end time falls
// inside this window (and is still in the future) triggers a one-time heads-up
// to customers.
const ENDING_SOON_WINDOW_HOURS = 24;

// "in 5 hours" / "in 1 day" — a short human window for the message body.
function timeLeftLabel(end, now) {
  const ms = new Date(end).getTime() - now.getTime();
  const hours = Math.max(1, Math.round(ms / (1000 * 60 * 60)));
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'}`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? '' : 's'}`;
}

// Has an "ending soon" heads-up for this promo already gone out? We dedupe on
// the notification table itself (same pattern as the overdue-settlement job),
// so no schema flag is needed — one notification row proves it was sent.
async function alreadyNotified(type, key, value) {
  const existing = await prisma.notification.findFirst({
    where: { type, data: { path: [key], equals: value } },
    select: { id: true },
  });
  return !!existing;
}

// Send an in-app notification (+ FCM push) to the right audience: everyone when
// the promo is public, or only the targeted customers when it's restricted.
async function notifyAudience({ targetCustomerIds, type, title, message, data }) {
  if (Array.isArray(targetCustomerIds) && targetCustomerIds.length > 0) {
    await createNotificationForUsers({ userIds: targetCustomerIds, role: 'USER', type, title, message, data });
  } else {
    await createNotificationForRole({ role: 'USER', type, title, message, data });
  }
}

/**
 * Find offers and coupons ending within the next ENDING_SOON_WINDOW_HOURS and
 * send each one a single "ending soon" in-app notification to customers.
 *
 * Exported separately from the scheduler so it can also be triggered by Vercel
 * Cron (GET /api/jobs/promo-ending-soon) — node-cron only fires on a
 * long-running server, which Vercel serverless is not.
 *
 * @returns {Promise<{offersNotified: number, couponsNotified: number}>}
 */
async function notifyEndingPromos() {
  const now = new Date();
  const windowEnd = new Date(now.getTime() + ENDING_SOON_WINDOW_HOURS * 60 * 60 * 1000);

  const [offers, coupons] = await Promise.all([
    prisma.offer.findMany({
      where: { isActive: true, endsAt: { gt: now, lte: windowEnd } },
      select: { id: true, title: true, endsAt: true, targetCustomerIds: true },
    }),
    prisma.coupon.findMany({
      where: {
        isActive: true,
        isFirstOrder: false, // first-order coupons aren't a broadcast promo
        expiryDate: { gt: now, lte: windowEnd },
      },
      select: { id: true, code: true, description: true, expiryDate: true, targetCustomerIds: true },
    }),
  ]);

  let offersNotified = 0;
  let couponsNotified = 0;

  for (const offer of offers) {
    if (await alreadyNotified('OFFER_ENDING_SOON', 'offerId', offer.id)) continue;
    const left = timeLeftLabel(offer.endsAt, now);
    await notifyAudience({
      targetCustomerIds: offer.targetCustomerIds,
      type: 'OFFER_ENDING_SOON',
      title: 'Offer ending soon',
      message: `Hurry! "${offer.title}" ends in ${left}. Grab it before it's gone.`,
      data: { type: 'OFFER_ENDING_SOON', offerId: offer.id, screen: 'offers' },
    });
    offersNotified += 1;
    console.log(`[Cron] Ending-soon notice sent for offer "${offer.title}" (ends in ${left}).`);
  }

  for (const coupon of coupons) {
    if (await alreadyNotified('COUPON_ENDING_SOON', 'couponId', coupon.id)) continue;
    const left = timeLeftLabel(coupon.expiryDate, now);
    await notifyAudience({
      targetCustomerIds: coupon.targetCustomerIds,
      type: 'COUPON_ENDING_SOON',
      title: 'Coupon expiring soon',
      message: `Your coupon ${coupon.code} expires in ${left}. Use it before it's gone!`,
      data: { type: 'COUPON_ENDING_SOON', couponId: coupon.id, code: coupon.code, screen: 'offers' },
    });
    couponsNotified += 1;
    console.log(`[Cron] Ending-soon notice sent for coupon ${coupon.code} (expires in ${left}).`);
  }

  if (offersNotified === 0 && couponsNotified === 0) {
    console.log('[Cron] No offers/coupons ending soon needed a notification.');
  }

  return { offersNotified, couponsNotified };
}

/**
 * Schedule the hourly check via node-cron. Reliable only on a long-running
 * server (local dev / VM); on Vercel the same check runs through Vercel Cron.
 */
function startPromoEndingSoonCheck() {
  cron.schedule('0 * * * *', async () => {
    console.log('[Cron] Checking for offers/coupons ending soon...');
    try {
      await notifyEndingPromos();
    } catch (error) {
      console.error('[Cron] Promo ending-soon check failed:', error);
    }
  });

  console.log('[Cron] Promo ending-soon check scheduled — runs hourly');
}

module.exports = { startPromoEndingSoonCheck, notifyEndingPromos };
