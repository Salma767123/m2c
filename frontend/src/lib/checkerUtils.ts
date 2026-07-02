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
