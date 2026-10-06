const cron = require('node-cron');
const creditPoints = require('../utils/creditPoints');

/**
 * Expire credit-points lots whose expiresAt has passed. Delegates to the
 * creditPoints util (which zeroes each stale lot's `remaining`, writes an EXPIRE
 * ledger row and re-settles the account balance).
 *
 * Exported separately from the scheduler so it can also be triggered by Vercel
 * Cron (GET /api/jobs/points-expiry) — node-cron only fires on a long-running
 * server, which Vercel serverless is not.
 *
 * @returns {Promise<{expiredLots: number, expiredPoints: number}>}
 */
async function runPointsExpiry() {
  const settings = await creditPoints.getSettings().catch(() => null);
  // No-op when the program is off or expiry is disabled (expiryDays = 0 ⇒ no lot
  // ever carries an expiresAt, so there is nothing to sweep).
  if (!settings || !settings.enabled || !(settings.expiryDays > 0)) {
    return { expiredLots: 0, expiredPoints: 0 };
  }
  const result = await creditPoints.expirePoints();
  if (result.expiredPoints > 0) {
    console.log(`[Cron] Expired ${result.expiredPoints} credit points across ${result.expiredLots} lot(s).`);
  }
  return result;
}

/**
 * Schedule the daily expiry sweep via node-cron. Reliable only on a long-running
 * server (local dev / VM); on Vercel the same check runs through Vercel Cron.
 */
function startPointsExpiry() {
  // Daily at 02:30 — off-peak. (Vercel Hobby allows only daily crons.)
  cron.schedule('30 2 * * *', async () => {
    console.log('[Cron] Running credit-points expiry sweep...');
    try {
      await runPointsExpiry();
    } catch (error) {
      console.error('[Cron] Credit-points expiry sweep failed:', error);
    }
  });

  console.log('[Cron] Credit-points expiry sweep scheduled — runs daily');
}

module.exports = { startPointsExpiry, runPointsExpiry };
