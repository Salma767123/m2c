// Shared helpers for the product "Dimensions" field + its unit of measure.
// The unit is stored appended to the dimensions string (e.g. "230x250 cm") so
// no schema change is needed and every display surface shows it automatically.
// Used by both the vendor and admin product forms so the logic stays identical.

export const DIMENSION_UNITS = [
  { value: 'cm', label: 'Centimeters (cm)' },
  { value: 'in', label: 'Inches (in)' },
  { value: 'ft', label: 'Feet (ft)' },
  { value: 'm', label: 'Meters (m)' },
  { value: 'mm', label: 'Millimeters (mm)' },
  { value: 'yd', label: 'Yards (yd)' },
];

export const DIMENSION_UNIT_VALUES = DIMENSION_UNITS.map((u) => u.value);

export const DEFAULT_DIMENSION_UNIT = 'cm';

// Split a stored dimensions string into its measurement + unit. Falls back to
// the default unit when no recognised unit is present (legacy values).
export function parseDimensions(raw?: string | null): { value: string; unit: string } {
  const text = (raw || '').trim();
  if (!text) return { value: '', unit: DEFAULT_DIMENSION_UNIT };
  const parts = text.split(/\s+/);
  const last = parts[parts.length - 1].toLowerCase();
  if (parts.length > 1 && DIMENSION_UNIT_VALUES.includes(last)) {
    return { value: parts.slice(0, -1).join(' '), unit: last };
  }
  return { value: text, unit: DEFAULT_DIMENSION_UNIT };
}

// Combine a measurement + unit back into the stored string. Empty in → empty out.
export function combineDimensions(value?: string, unit?: string): string {
  const v = (value || '').trim();
  if (!v) return '';
  return `${v} ${unit || DEFAULT_DIMENSION_UNIT}`;
}
