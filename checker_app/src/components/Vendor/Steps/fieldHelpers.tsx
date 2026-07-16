// RN port of helper functions used across the Vendor verification steps.
// Consolidates the web helpers pulled from several frontend modules:
//   - frontend/src/lib/utils.ts            -> buildFullName
//   - frontend/src/components/VendorHub/FormUI.tsx -> formatLocalLandline / formatIntlLandline / parsePhone
//   - frontend/src/lib/checkerUtils.ts     -> formatCheckerName
// Kept 1:1 with the source so display values match the web portal exactly.

// ── Name builder ──────────────────────────────────────────────────────────
export function buildFullName(
  title?: string | null,
  firstName?: string | null,
  middleName?: string | null,
  lastName?: string | null,
  fallback?: string | null,
): string {
  const parts = [title, firstName, middleName, lastName].filter(Boolean);
  if (parts.length > 0) return parts.join(' ');
  return fallback || '';
}

// ── Checker name (title + name) ────────────────────────────────────────────
export function formatCheckerName(
  checker: { title?: string | null; name?: string | null } | null | undefined,
): string {
  if (!checker) return '';
  return [checker.title, checker.name].filter(Boolean).join(' ');
}

// ── Landline formatting (mirrors FormUI.tsx) ────────────────────────────────
export function formatLocalLandline(
  parts?: { countryCode?: string | null; std?: string | null; number?: string | null } | null,
): string {
  if (!parts) return '';
  const cc = (parts.countryCode || '').toString().trim();
  const std = (parts.std || '').toString().trim();
  const num = (parts.number || '').toString().trim();
  if (!num) return '';
  return [cc, std, num].filter(Boolean).join(' ');
}

// Minimal parsePhone: split a leading +<dial> off an E.164-ish value.
// Web uses a full country-code table; for display we only need dial + national.
const DEFAULT_DIAL = '+91';
function parsePhone(value?: string | null): { dial: string; national: string } {
  if (!value) return { dial: DEFAULT_DIAL, national: '' };
  const trimmed = value.replace(/\s+/g, '');
  const m = trimmed.match(/^(\+\d{1,4})(\d+)$/);
  if (m) return { dial: m[1], national: m[2].replace(/\D/g, '') };
  return { dial: DEFAULT_DIAL, national: trimmed.replace(/\D/g, '') };
}

export function formatIntlLandline(value?: string | null): string {
  if (!value) return '';
  const { dial, national } = parsePhone(value);
  if (!national) return '';
  return `${dial} ${national}`;
}

// ── Label maps (mirror the per-step web components) ─────────────────────────
export function getBusinessTypeLabel(val: string): string {
  const map: Record<string, string> = {
    proprietorship: 'Proprietorship',
    'pvt-ltd': 'Private Limited Company',
    'partnership-firm': 'Partnership Firm',
    llp: 'Limited Liability Partnership (LLP)',
    unregistered: 'Unregistered',
  };
  return map[val] || val;
}

export function getCompanyIdLabel(businessType: string): string {
  switch (businessType) {
    case 'pvt-ltd':
      return 'Company Identification Number (CIN)';
    case 'partnership-firm':
      return 'Partnership Deed Registration Number';
    case 'llp':
      return 'LLPIN';
    default:
      return 'Company ID Number';
  }
}

export function getOwnershipTypeLabel(val: string): string {
  const map: Record<string, string> = { owned: 'Owned', rented: 'Rented', lease: 'Lease' };
  return map[val] || val;
}

export function getEmployeeCountLabel(val: string): string {
  const map: Record<string, string> = {
    '10-20': '10–20 employees',
    '20-50': '20–50 employees',
    '50-100': '50–100 employees',
    '100+': 'More than 100 employees',
  };
  return map[val] || val;
}

// Owner designation code → label (mirrors frontend/src/lib/utils.ts
// resolveOwnerDesignation). Falls through to the raw value for custom/unknown
// strings so old data or free-typed entries still render as-is.
const OWNER_DESIGNATION_LABEL: Record<string, string> = {
  proprietor: 'Proprietor',
  ceo: 'CEO',
  director: 'Director',
  'managing-director': 'Managing Director',
  founder: 'Founder',
  other: 'Other',
};
export function resolveOwnerDesignation(value?: string | null): string {
  if (!value) return '';
  return OWNER_DESIGNATION_LABEL[value] ?? value;
}

// ── Country flags (mirrors web VI_Step7 withFlags) ──────────────────────────
// Country name → ISO2 for common countries so we can render a flag image via
// flagcdn. Unmappable names fall back to a plain (flag-less) chip.
export const COUNTRY_ISO: Record<string, string> = {
  India: 'IN', 'United States': 'US', 'United States of America': 'US',
  'United Kingdom': 'GB', China: 'CN', Germany: 'DE', France: 'FR', Italy: 'IT',
  Spain: 'ES', Canada: 'CA', Australia: 'AU', Japan: 'JP', Bangladesh: 'BD',
  Pakistan: 'PK', 'Sri Lanka': 'LK', Nepal: 'NP', 'United Arab Emirates': 'AE',
  'Saudi Arabia': 'SA', Singapore: 'SG', Malaysia: 'MY', Thailand: 'TH',
  Vietnam: 'VN', Indonesia: 'ID', Netherlands: 'NL', Belgium: 'BE',
  Switzerland: 'CH', Sweden: 'SE', Norway: 'NO', Denmark: 'DK', Poland: 'PL',
  Turkey: 'TR', Russia: 'RU', Brazil: 'BR', Mexico: 'MX', 'South Africa': 'ZA',
  Egypt: 'EG', Nigeria: 'NG', Kenya: 'KE', 'South Korea': 'KR',
  'New Zealand': 'NZ', Ireland: 'IE', Portugal: 'PT', Austria: 'AT',
  Greece: 'GR', Israel: 'IL', Qatar: 'QA', Kuwait: 'KW', Bahrain: 'BH',
  Oman: 'OM', 'Hong Kong': 'HK', Taiwan: 'TW', Philippines: 'PH',
};

export interface FlagItem {
  flagIso: string;
  label: string;
}

// Map country names → { flagIso, label } objects the list renderer understands.
export function withFlags(countries: string[]): FlagItem[] {
  return (Array.isArray(countries) ? countries : []).map((name) => ({
    flagIso: COUNTRY_ISO[name] || '',
    label: name,
  }));
}

// Append a unit if the value is a plain number (no letters already present).
export function withUnit(val: any, unit?: string): any {
  if (!val || !unit) return val;
  const s = String(val).trim();
  if (/[a-zA-Z]/.test(s)) return s;
  return `${s} ${unit}`;
}

// Manufacturing facility metadata — mirrors VI_Step5_Manufacturing FACILITY_META.
export const FACILITY_META: Record<
  string,
  { label: string; detailFields: Array<{ key: string; label: string; unit?: string }> }
> = {
  spinning: {
    label: 'Spinning',
    detailFields: [
      { key: 'spinningMachines', label: 'Number of Machines', unit: 'Machines' },
      { key: 'spinningCapacity', label: 'Daily Capacity', unit: 'Kg / Day' },
      { key: 'remarks', label: 'Remarks' },
    ],
  },
  weaving: {
    label: 'Weaving',
    detailFields: [
      // `loomCount` is a legacy field key — the form labels it "Number of
      // Machines" like every other facility; don't surface "looms" wording.
      { key: 'loomCount', label: 'Number of Machines', unit: 'Machines' },
      { key: 'weavingCapacity', label: 'Daily Capacity', unit: 'Kg / Day' },
      { key: 'remarks', label: 'Remarks' },
    ],
  },
  dyeing: {
    label: 'Dyeing',
    detailFields: [
      { key: 'dyeingMachines', label: 'Number of Machines', unit: 'Machines' },
      { key: 'dyeingCapacity', label: 'Daily Capacity', unit: 'Kg / Day' },
      { key: 'remarks', label: 'Remarks' },
    ],
  },
  printing: {
    label: 'Printing',
    detailFields: [
      { key: 'printingMachines', label: 'Number of Machines', unit: 'Machines' },
      { key: 'printingCapacity', label: 'Daily Capacity', unit: 'Kg / Day' },
      { key: 'remarks', label: 'Remarks' },
    ],
  },
  stitching: {
    label: 'Stitching',
    detailFields: [
      { key: 'stitchingMachines', label: 'Number of Machines', unit: 'Machines' },
      { key: 'stitchingCapacity', label: 'Daily Capacity', unit: 'Pieces / Day' },
      { key: 'remarks', label: 'Remarks' },
    ],
  },
  finishing: {
    // Form name for this stage — "Finishing" alone doesn't match what the
    // vendor selected on the Manufacturing Facilities step.
    label: 'Final Packing and Dispatch',
    detailFields: [
      { key: 'finishingCapacity', label: 'Daily Capacity', unit: 'Pieces / Day' },
      { key: 'remarks', label: 'Remarks' },
    ],
  },
};

// ── Document URL / proxy logic (mirrors DocViewerModal.getProxyUrl) ─────────
// PDFs / non-image docs hosted on Cloudinary are routed through the backend
// document-proxy; everything else opens directly.
const DOC_EXT = /\.(pdf|docx?|xlsx?|pptx?|txt|csv|rtf)(\?|$)/i;

export function isImageUrl(url?: string, name?: string): boolean {
  if (!url) return false;
  if (name) {
    if (DOC_EXT.test(name)) return false;
    if (/\.(png|jpe?g|gif|webp|bmp|svg)(\?|$)/i.test(name)) return true;
  }
  if (DOC_EXT.test(url)) return false;
  if (/\.(png|jpe?g|gif|webp|bmp|svg)(\?|$)/i.test(url)) return true;
  try {
    return /\/image\/upload\//.test(new URL(url).pathname);
  } catch {
    return false;
  }
}

export function getProxyUrl(url: string): string {
  try {
    if (/^res\.cloudinary\.com$/i.test(new URL(url).hostname)) {
      const base = (process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:5000/api').replace(/\/+$/, '');
      return `${base}/document-proxy?url=${encodeURIComponent(url)}`;
    }
  } catch {
    /* non-Cloudinary: use direct URL */
  }
  return url;
}

export function docFilename(url: string): string {
  try {
    const path = new URL(url).pathname;
    const raw = path.split('/').pop() || 'Document';
    return decodeURIComponent(raw.split('?')[0]);
  } catch {
    return 'Document';
  }
}
