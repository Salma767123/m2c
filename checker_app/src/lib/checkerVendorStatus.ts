// ─── QC Checker vendor status derivation ────────────────────────────────────
// Mobile port of `frontend/src/lib/checkerVendorStatus.ts`.
//
// Single source of truth for turning a vendor's raw DB status (+ its latest
// inspection) into the display "main status" and "inspection status" used across
// the checker app. The dashboard metrics derive from the same functions the
// Vendors list filters on, so a card's number always equals the number of rows
// its filter shows.

type LatestInspection = {
  status?: string | null;
  result?: string | null;
  cycleNumber?: number | null;
} | null;

/** Display "main status" (New Assignment / Under Review by Admin / Approved / …). */
export function getVendorMainStatus(dbStatus: string, latestInspection?: LatestInspection): string {
  const status = dbStatus?.toUpperCase() || 'PENDING';
  if (status === 'APPROVED') return 'Approved';
  if (status === 'REJECTED') return 'Rejected';
  if (status === 'REINSPECTION') return 'Re-Inspection';
  if (status === 'UNDER_REVIEW') {
    if (latestInspection) {
      const inspStatus = latestInspection.status?.toUpperCase();
      const cycle = latestInspection.cycleNumber ?? 1;
      if (inspStatus === 'SCHEDULED' || inspStatus === 'IN_PROGRESS') {
        return cycle > 1 ? 'Re-Inspection' : 'New Assignment';
      }
      if (inspStatus === 'SUBMITTED' || inspStatus === 'UNDER_ADMIN_REVIEW') {
        return cycle > 1 ? 'Re-Inspection Under Review by Admin' : 'Under Review by Admin';
      }
    }
    return 'Under Review by Admin';
  }
  if (status === 'PENDING') return 'New Assignment';
  return status.replace(/_/g, ' ').toLowerCase();
}

/** Display "inspection status" (Pending / Submitted / Completed / Rejected). */
export function getVendorInspectionStatus(dbStatus: string, latestInspection?: LatestInspection): string {
  const status = dbStatus?.toUpperCase() || 'PENDING';
  if (status === 'APPROVED') return 'Completed';
  if (status === 'REJECTED') {
    if (latestInspection && latestInspection.result?.toUpperCase() === 'FAILED') return 'Rejected';
    return 'Completed';
  }
  if (status === 'REINSPECTION') return 'Pending';
  if (status === 'UNDER_REVIEW') {
    if (latestInspection) {
      const inspStatus = latestInspection.status?.toUpperCase();
      if (inspStatus === 'SCHEDULED' || inspStatus === 'IN_PROGRESS') return 'Pending';
      if (inspStatus === 'SUBMITTED' || inspStatus === 'UNDER_ADMIN_REVIEW') {
        return latestInspection.result?.toUpperCase() === 'FAILED' ? 'Rejected' : 'Submitted';
      }
    }
    return 'Pending';
  }
  if (status === 'PENDING') return 'Pending';
  return 'Pending';
}

/** Derived inspection status straight from a raw assigned-vendor record. */
export function vendorInspectionStatusOf(v: {
  status?: string | null;
  inspections?: LatestInspection[] | null;
}): string {
  const latest = v.inspections && v.inspections.length > 0 ? v.inspections[0] : null;
  return getVendorInspectionStatus(v.status || '', latest);
}

/**
 * Sortable timestamp for a vendor's inspection window: the latest inspection's
 * scheduledDate (YYYY-MM-DD) + scheduledTime ("08:16 AM"). Falls back to the
 * assignment / submission time when nothing is scheduled yet.
 */
export function vendorScheduledMs(vendor: any): number {
  const insp = vendor?.inspections?.[0];
  if (insp?.scheduledDate) {
    const t = new Date(`${insp.scheduledDate} ${insp.scheduledTime || '00:00'}`).getTime();
    if (!isNaN(t)) return t;
    const d = new Date(insp.scheduledDate).getTime();
    if (!isNaN(d)) return d;
  }
  return new Date(vendor?.assignedQcAt || vendor?.submittedAt || 0).getTime();
}

/** "2026-09-15" → "15 Sep 2026" (parsed as local midnight, so the date can't shift). */
export function formatScheduledDate(ymd?: string | null): string {
  if (!ymd) return '';
  const d = new Date(`${ymd}T00:00:00`);
  if (isNaN(d.getTime())) return ymd;
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

/**
 * Normalize an inspection's scheduledTime to a 12-hour clock with a meridiem,
 * whatever the admin stored: 24-hour ("20:50" → "8:50 PM"), bare ("09:00" →
 * "9:00 AM"), or already-12h ("08:16 AM" → "8:16 AM").
 *
 * The dashboard was printing this field raw, so a slot saved in 24-hour form
 * arrived as "20:50" with no meridiem at all — and "08:16" is a genuinely
 * ambiguous thing to show a checker who has to be on site at one of them. The
 * web dashboard already normalized it; this is that same function, so the two
 * screens can no longer disagree about the same booking.
 *
 * Anything unparseable is returned untouched: a value we do not recognise is
 * still a value the admin typed, and blanking it would be worse than showing
 * it in whatever shape it arrived.
 */
export function formatScheduledTime(raw?: string | null): string {
  if (!raw) return '';
  const s = String(raw).trim();
  const m = s.match(/^(\d{1,2}):(\d{2})\s*([AaPp][Mm])?$/);
  if (!m) return s;
  let h = parseInt(m[1], 10);
  const min = m[2];
  const mer = m[3]?.toUpperCase();
  if (mer) {
    // Already 12-hour — just canonicalize (drop any leading zero, uppercase).
    if (h === 0) h = 12;
    return `${h}:${min} ${mer}`;
  }
  // 24-hour (or bare) input → convert to 12-hour.
  const suffix = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${min} ${suffix}`;
}
