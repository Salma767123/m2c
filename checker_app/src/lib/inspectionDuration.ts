// Duration math for inspections — the single app-side source of truth for the
// report's active / paused / total breakdown and the "exceeded schedule" flag.
//
// RN port of frontend/src/lib/inspectionDuration.ts, kept identical so a report
// generated on the phone and one generated in the web portal agree to the minute.
// parseDurationMs mirrors backend/utils/inspectionSchedule.js so both sides agree.

const HOUR_MS = 60 * 60 * 1000;

// "3 hours" / "90 minutes" / "1.5 hours" / "1 Hour" / "1 day" → milliseconds.
// Defaults to 1 hour when the string is missing or unrecognised.
export function parseDurationMs(estimatedDuration?: string | null): number {
  if (!estimatedDuration) return HOUR_MS;
  const str = String(estimatedDuration).toLowerCase().trim();
  const num = parseFloat(str);
  if (isNaN(num)) return HOUR_MS;
  if (str.includes('min')) return num * 60 * 1000;
  if (str.includes('day')) return num * 24 * HOUR_MS;
  // Default unit is hours ("3 hours", "1 Hour", "2").
  return num * HOUR_MS;
}

export interface InspectionDurations {
  startedAt: Date | null;
  endedAt: Date | null;
  /** Time actually spent working (total minus paused). */
  activeMs: number;
  /** Accumulated paused time across all resume cycles. */
  pausedMs: number;
  /** Wall-clock from first start to end, pauses included. */
  totalMs: number;
  /** The booked/scheduled duration, from estimatedDuration. */
  scheduledMs: number;
  /** True when active work time ran past the scheduled duration. */
  exceeded: boolean;
}

// Compute the active / paused / total durations for an inspection.
//  - `end`: override the end anchor. The checker's LIVE report passes `now` (the
//    inspection isn't submitted yet); otherwise submittedAt || completedAt is used.
//  - Any still-open pause (`pausedAt`) is folded into paused up to the end anchor.
export function computeInspectionDurations(inspection: any, end?: Date | null): InspectionDurations {
  const startedAt = inspection?.startedAt ? new Date(inspection.startedAt) : null;
  const endedAt =
    end ??
    (inspection?.submittedAt
      ? new Date(inspection.submittedAt)
      : inspection?.completedAt
        ? new Date(inspection.completedAt)
        : null);

  const scheduledMs = parseDurationMs(inspection?.estimatedDuration);

  if (!startedAt || !endedAt) {
    return {
      startedAt,
      endedAt: endedAt ?? null,
      activeMs: 0,
      pausedMs: 0,
      totalMs: 0,
      scheduledMs,
      exceeded: false,
    };
  }

  const totalMs = Math.max(0, endedAt.getTime() - startedAt.getTime());
  let pausedMs = inspection?.totalPausedMs || 0;
  // Report generated while still paused → count the open pause too.
  if (inspection?.pausedAt) {
    pausedMs += Math.max(0, endedAt.getTime() - new Date(inspection.pausedAt).getTime());
  }
  pausedMs = Math.min(pausedMs, totalMs);
  const activeMs = Math.max(0, totalMs - pausedMs);
  const exceeded = activeMs > scheduledMs;

  return { startedAt, endedAt, activeMs, pausedMs, totalMs, scheduledMs, exceeded };
}

// Format a millisecond duration as "Xh Ym" (e.g. "3h 20m", "45m", "0m").
export function formatDuration(ms: number): string {
  if (!ms || ms < 0) return '0m';
  const totalMin = Math.round(ms / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h > 0) return m > 0 ? `${h}h ${m}m` : `${h}h`;
  return `${m}m`;
}

// Live overtime for an in-progress inspection: active work time already past the
// scheduled duration. Used for list badges while the inspection is still running.
export function isInspectionOvertimeLive(inspection: any, now: Date = new Date()): boolean {
  if (!inspection?.startedAt) return false;
  const { exceeded } = computeInspectionDurations(inspection, now);
  return exceeded;
}
