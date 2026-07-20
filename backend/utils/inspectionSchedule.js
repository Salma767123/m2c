// Inspection scheduling math — the single source of truth for when an
// assignment's booked window starts and ends.
//
// An assignment books a window [scheduledStart, scheduledStart + duration].
// The checker may start the inspection any time inside that window. Once the
// whole window has elapsed without a start, the assignment is EXPIRED and the
// checker can no longer begin it (see inspectionController.startInspection and
// jobs/inspectionReminders.js).
//
// Times are stored as local-wall-clock strings (scheduledDate "YYYY-MM-DD",
// scheduledTime "HH:MM AM/PM"), so we build Dates in the server's local time —
// consistent with how createInspection rejects past dates.

const HOUR_MS = 60 * 60 * 1000;

// "YYYY-MM-DD" + "HH:MM AM/PM" → local Date. Returns null if unparseable.
function parseScheduledStart(scheduledDate, scheduledTime) {
    if (!scheduledDate) return null;
    const [y, m, d] = String(scheduledDate).split('-').map((n) => parseInt(n, 10));
    if (!y || !m || !d) return null;

    let hours = 0;
    let minutes = 0;
    if (scheduledTime) {
        const match = String(scheduledTime).trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
        if (match) {
            hours = parseInt(match[1], 10);
            minutes = parseInt(match[2], 10);
            const mer = match[3] ? match[3].toUpperCase() : null;
            if (mer === 'PM' && hours < 12) hours += 12;
            if (mer === 'AM' && hours === 12) hours = 0;
        }
    }
    return new Date(y, m - 1, d, hours, minutes, 0, 0);
}

// "3 hours" / "90 minutes" / "1.5 hours" / "1 Hour" / "1 day" → milliseconds.
// Defaults to 1 hour when the string is missing or unrecognised.
function parseDurationMs(estimatedDuration) {
    if (!estimatedDuration) return HOUR_MS;
    const str = String(estimatedDuration).toLowerCase().trim();
    const num = parseFloat(str);
    if (isNaN(num)) return HOUR_MS;
    if (str.includes('min')) return num * 60 * 1000;
    if (str.includes('day')) return num * 24 * HOUR_MS;
    // Default unit is hours ("3 hours", "1 Hour", "2").
    return num * HOUR_MS;
}

// End of the booked window = start + estimated duration. Null if no valid start.
function getInspectionDeadline(inspection) {
    const start = parseScheduledStart(inspection?.scheduledDate, inspection?.scheduledTime);
    if (!start) return null;
    return new Date(start.getTime() + parseDurationMs(inspection?.estimatedDuration));
}

// True when a not-yet-started (SCHEDULED) assignment's window has fully elapsed.
// Used by the cron sweep, which must NOT auto-expire IN_PROGRESS work.
function isInspectionExpired(inspection, now = new Date()) {
    if (!inspection || inspection.status !== 'SCHEDULED') return false;
    const deadline = getInspectionDeadline(inspection);
    if (!deadline) return false;
    return now.getTime() > deadline.getTime();
}

// True when the booked window has fully elapsed, regardless of status. Used by
// the interactive start/resume guard: opening the form (which flips SCHEDULED →
// IN_PROGRESS on first load) must be blocked once the window is over, whether
// the inspection was never started (SCHEDULED) or opened once but not submitted
// (IN_PROGRESS). Terminal states (SUBMITTED/COMPLETED/…) are handled elsewhere.
function isInspectionWindowElapsed(inspection, now = new Date()) {
    if (!inspection) return false;
    const deadline = getInspectionDeadline(inspection);
    if (!deadline) return false;
    return now.getTime() > deadline.getTime();
}

// True for an IN_PROGRESS inspection whose window elapsed but isn't finished —
// used purely for an "Overtime" badge on the admin side (never blocks anything).
function isInspectionOvertime(inspection, now = new Date()) {
    if (!inspection || inspection.status !== 'IN_PROGRESS') return false;
    const deadline = getInspectionDeadline(inspection);
    if (!deadline) return false;
    return now.getTime() > deadline.getTime();
}

module.exports = {
    HOUR_MS,
    parseScheduledStart,
    parseDurationMs,
    getInspectionDeadline,
    isInspectionExpired,
    isInspectionWindowElapsed,
    isInspectionOvertime,
};
