/**
 * Format an inspection date for display as date-month-year (e.g. "20 Jul 2026").
 * Inspection dates are stored as "YYYY-MM-DD" (local, via en-CA). Returns '' for
 * empty input and passes through anything that isn't a parseable Y-M-D date.
 */
export function formatInspectionDate(ymd?: string | null): string {
  if (!ymd) return '';
  const d = new Date(`${ymd}T00:00:00`);
  return isNaN(d.getTime())
    ? ymd
    : d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

/**
 * Returns the fully formatted display name for a QC checker, prepending the
 * title (Mr. / Mrs. / Miss) when present.
 * Safe to call with null / undefined — returns '' in that case.
 */
export function formatCheckerName(
  checker: { title?: string | null; name?: string | null } | null | undefined
): string {
  if (!checker) return ''
  return [checker.title, checker.name].filter(Boolean).join(' ')
}
