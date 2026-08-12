// Area / capacity formatting. Vendor `factorySize` / `warehouseSize` are stored WITH
// the unit baked in (e.g. "3000 sq ft"), but some legacy rows hold just a number.
// Appending " sq ft" blindly produced "3000 sq ft sq ft". This normalises either
// shape to exactly one trailing "sq ft".
export function formatSqFt(value?: string | number | null): string {
  if (value === null || value === undefined) return '';
  const s = String(value).trim();
  if (!s) return '';
  // Strip any existing sq ft / sqft / sq.ft. suffix (spacing/case tolerant).
  const num = s.replace(/\s*sq\.?\s*ft\.?\s*$/i, '').trim();
  if (!num) return '';
  return `${num} sq ft`;
}
