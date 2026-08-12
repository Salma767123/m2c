// Client mirror of frontend/src/lib/inspectionSchedule.ts (which mirrors
// backend/utils/inspectionSchedule.js).
//
// An assignment books a window [scheduledStart, scheduledStart + duration]. The
// checker may open/start the inspection any time inside that window; once the
// whole window has elapsed, it can no longer be started. Used by the product
// inspection flow so the deadline rule is identical across web + mobile.

/** End of the booked window as a Date, or null if the schedule is incomplete. */
export function getInspectionDeadline(
  scheduledDate?: string | null,
  scheduledTime?: string | null,
  estimatedDuration?: string | null,
): Date | null {
  if (!scheduledDate) return null;
  const [y, m, d] = String(scheduledDate).split('-').map((n) => parseInt(n, 10));
  if (!y || !m || !d) return null;

  let hours = 0;
  let minutes = 0;
  const match = String(scheduledTime || '').trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (match) {
    hours = parseInt(match[1], 10);
    minutes = parseInt(match[2], 10);
    const mer = match[3]?.toUpperCase();
    if (mer === 'PM' && hours < 12) hours += 12;
    if (mer === 'AM' && hours === 12) hours = 0;
  }
  const start = new Date(y, m - 1, d, hours, minutes, 0, 0);

  const durStr = String(estimatedDuration || '1 hour').toLowerCase();
  const durNum = parseFloat(durStr) || 1;
  const durMs = durStr.includes('min')
    ? durNum * 60_000
    : durStr.includes('day')
      ? durNum * 86_400_000
      : durNum * 3_600_000;
  return new Date(start.getTime() + durMs);
}

/** True once the whole booked window has elapsed (can no longer be started). */
export function isInspectionWindowElapsed(
  scheduledDate?: string | null,
  scheduledTime?: string | null,
  estimatedDuration?: string | null,
): boolean {
  const deadline = getInspectionDeadline(scheduledDate, scheduledTime, estimatedDuration);
  if (!deadline) return false;
  return Date.now() > deadline.getTime();
}

/** Readable label for an assignment window, e.g. "24 Jul 2026, 02:30 PM · 3 hours". */
export function formatAssignmentWindow(
  scheduledDate?: string | null,
  scheduledTime?: string | null,
  estimatedDuration?: string | null,
): string {
  if (!scheduledDate) return '—';
  const start = getInspectionDeadline(scheduledDate, scheduledTime, '0 hour'); // reuse parser at 0 duration = start
  if (!start) return '—';
  const dateLabel = start.toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    ...(scheduledTime ? { hour: '2-digit', minute: '2-digit', hour12: true } : {}),
  });
  return estimatedDuration ? `${dateLabel} · ${estimatedDuration}` : dateLabel;
}
