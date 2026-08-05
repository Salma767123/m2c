const cron = require('node-cron');
const { prisma } = require('../config/database');
const { createNotification, createNotificationForRole } = require('../controllers/notificationController');
const { sendTemplatedEmail } = require('../utils/emailTemplateRenderer');
const { parseScheduledStart, getInspectionDeadline, isInspectionExpired, HOUR_MS } = require('../utils/inspectionSchedule');

// How close to the scheduled start the "starting soon" reminder fires. We look
// for inspections whose start is within the next hour and haven't been reminded
// yet. A short catch-up window (past starts still SCHEDULED but not yet expired)
// is covered because the reminder only cares that it hasn't fired before.
const REMINDER_LEAD_MS = HOUR_MS; // 1 hour before start

/**
 * One sweep of all SCHEDULED inspections:
 *   1. Reminder — start is within the next hour and no reminder has been sent →
 *      in-app notification + email to the checker, then stamp reminderSentAt.
 *   2. Expiry — the booked window has fully elapsed → mark EXPIRED (frees the
 *      vendor for reassignment) and notify the checker + admins.
 *
 * Exported so it can be triggered by an HTTP cron (Vercel) as well as node-cron.
 * @returns {Promise<{reminded: number, expired: number}>}
 */
async function runInspectionScheduleSweep() {
    const now = new Date();

    const scheduled = await prisma.inspection.findMany({
        where: { status: 'SCHEDULED' },
        include: {
            checker: { select: { name: true, email: true } },
            vendor: { select: { companyName: true, businessCity: true, businessState: true } },
        },
    });

    let reminded = 0;
    let expired = 0;

    for (const insp of scheduled) {
        // ── Expiry first — a lapsed assignment should never also be reminded. ──
        if (isInspectionExpired(insp, now)) {
            await prisma.inspection.update({
                where: { id: insp.id },
                data: { status: 'EXPIRED', expiredAt: now },
            }).catch((e) => console.error('[Cron] Failed to expire inspection', insp.id, e));

            const vendorName = insp.vendor?.companyName || 'Vendor';
            createNotification({
                userId: insp.checkerId, role: 'QC_CHECKER', type: 'INSPECTION_EXPIRED',
                title: 'Inspection Window Expired',
                message: `The inspection for "${vendorName}" (${insp.scheduledDate} ${insp.scheduledTime}) has expired — its time window passed before it was started.`,
                data: { screen: 'vendors', vendorId: insp.vendorId },
            }).catch(() => {});
            createNotificationForRole({
                role: 'ADMIN', type: 'INSPECTION_EXPIRED',
                title: 'Inspection Missed',
                message: `"${vendorName}" inspection (scheduled ${insp.scheduledDate} ${insp.scheduledTime}) expired — the checker did not start it in time. Reassign a new QC checker.`,
                data: { screen: 'assign-qc-checker', vendorId: insp.vendorId },
            }).catch(() => {});

            expired += 1;
            console.log(`[Cron] Inspection ${insp.id} expired (${insp.scheduledDate} ${insp.scheduledTime}).`);
            continue;
        }

        // ── Reminder — starts within the next hour and not yet reminded. ──
        if (insp.reminderSentAt) continue;
        const start = parseScheduledStart(insp.scheduledDate, insp.scheduledTime);
        if (!start) continue;
        const msUntilStart = start.getTime() - now.getTime();
        // Fire once the start is inside the lead window (and still in the future
        // enough to be useful — we allow up to the start moment itself).
        if (msUntilStart > REMINDER_LEAD_MS || msUntilStart < -5 * 60 * 1000) continue;

        const vendorName = insp.vendor?.companyName || 'Vendor';
        const factoryLocation = [insp.vendor?.businessCity, insp.vendor?.businessState].filter(Boolean).join(', ');

        createNotification({
            userId: insp.checkerId, role: 'QC_CHECKER', type: 'INSPECTION_REMINDER',
            title: 'Inspection Starting Soon',
            message: `Your inspection for "${vendorName}" is scheduled at ${insp.scheduledTime} today. Reach the location on time — it can only be started within its window.`,
            data: { screen: 'vendors', vendorId: insp.vendorId },
        }).catch(() => {});

        if (insp.checker?.email) {
            const checkerName = insp.checker.name;
            const scheduledDate = insp.scheduledDate;
            const scheduledTime = insp.scheduledTime;
            const estimatedDuration = insp.estimatedDuration;

            // Value paragraph + optional Location block collapse into one var.
            const estimatedDurationAndLocationBlock =
                `<p style="margin:0 0 ${factoryLocation ? '14px' : '0'};color:#111827;font-size:15px;font-weight:600;">${estimatedDuration || '—'}</p>`
                + (factoryLocation
                    ? `<p style="margin:0 0 6px;color:#6b7280;font-size:13px;">Location</p><p style="margin:0;color:#111827;font-size:15px;font-weight:600;">${factoryLocation}</p>`
                    : '');

            sendTemplatedEmail({
                key: 'inspection_reminder',
                to: insp.checker.email,
                data: {
                    checkerGreeting: checkerName || 'there',
                    vendorNameStrong: vendorName || 'a vendor',
                    vendorNameOrDash: vendorName || '—',
                    scheduledDateOrDash: scheduledDate || '—',
                    scheduledTimeOrDash: scheduledTime || '—',
                    estimatedDurationAndLocationBlock,
                    vendorNameSubject: vendorName || 'vendor',
                },
            }).catch((e) => console.error('[Cron] Reminder email failed for', insp.id, e?.message || e));
        }

        await prisma.inspection.update({
            where: { id: insp.id },
            data: { reminderSentAt: now },
        }).catch((e) => console.error('[Cron] Failed to stamp reminderSentAt', insp.id, e));

        reminded += 1;
        console.log(`[Cron] Inspection reminder sent for ${insp.id} (${vendorName}, ${insp.scheduledTime}).`);
    }

    if (reminded || expired) {
        console.log(`[Cron] Inspection sweep: ${reminded} reminded, ${expired} expired.`);
    }
    return { reminded, expired };
}

/**
 * Schedule the sweep every 5 minutes via node-cron. Reliable only on a
 * long-running server; on Vercel trigger runInspectionScheduleSweep over HTTP.
 */
function startInspectionScheduleSweep() {
    cron.schedule('*/5 * * * *', async () => {
        try {
            await runInspectionScheduleSweep();
        } catch (error) {
            console.error('[Cron] Inspection schedule sweep failed:', error);
        }
    });

    console.log('[Cron] Inspection reminder + expiry sweep scheduled — runs every 5 minutes');
}

module.exports = { startInspectionScheduleSweep, runInspectionScheduleSweep };
