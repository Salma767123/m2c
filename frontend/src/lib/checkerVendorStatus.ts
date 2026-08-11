// ─── QC Checker vendor status derivation ────────────────────────────────────
// Single source of truth for turning a vendor's raw DB status (+ its latest
// inspection) into the display "main status" and "inspection status" used across
// the checker portal. Both the Vendors list (for filtering) and the dashboard
// (for the metric counts) import these, so a metric count always equals the
// number of rows its card's filter shows.

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
export function vendorInspectionStatusOf(v: { status?: string | null; inspections?: LatestInspection[] | null }): string {
  const latest = v.inspections && v.inspections.length > 0 ? v.inspections[0] : null;
  return getVendorInspectionStatus(v.status || '', latest);
}
