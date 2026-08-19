// // RN port of helper functions used across the Vendor verification steps.
// // Consolidates the web helpers pulled from several frontend modules:
// //   - frontend/src/lib/utils.ts            -> buildFullName
// //   - frontend/src/components/VendorHub/FormUI.tsx -> formatLocalLandline / formatIntlLandline / parsePhone
// //   - frontend/src/lib/checkerUtils.ts     -> formatCheckerName
// // Kept 1:1 with the source so display values match the web portal exactly.

// // ── Name builder ──────────────────────────────────────────────────────────
// export function buildFullName(
//   title?: string | null,
//   firstName?: string | null,
//   middleName?: string | null,
//   lastName?: string | null,
//   fallback?: string | null,
// ): string {
//   const parts = [title, firstName, middleName, lastName].filter(Boolean);
//   if (parts.length > 0) return parts.join(' ');
//   return fallback || '';
// }

// // ── Checker name (title + name) ────────────────────────────────────────────
// export function formatCheckerName(
//   checker: { title?: string | null; name?: string | null } | null | undefined,
// ): string {
//   if (!checker) return '';
//   return [checker.title, checker.name].filter(Boolean).join(' ');
// }

// // ── Landline formatting (mirrors FormUI.tsx) ────────────────────────────────
// export function formatLocalLandline(
//   parts?: { countryCode?: string | null; std?: string | null; number?: string | null } | null,
// ): string {
//   if (!parts) return '';
//   const cc = (parts.countryCode || '').toString().trim();
//   const std = (parts.std || '').toString().trim();
//   const num = (parts.number || '').toString().trim();
//   if (!num) return '';
//   return [cc, std, num].filter(Boolean).join(' ');
// }

// // Minimal parsePhone: split a leading +<dial> off an E.164-ish value.
// // Web uses a full country-code table; for display we only need dial + national.
// const DEFAULT_DIAL = '+91';
// function parsePhone(value?: string | null): { dial: string; national: string } {
//   if (!value) return { dial: DEFAULT_DIAL, national: '' };
//   const trimmed = value.replace(/\s+/g, '');
//   const m = trimmed.match(/^(\+\d{1,4})(\d+)$/);
//   if (m) return { dial: m[1], national: m[2].replace(/\D/g, '') };
//   return { dial: DEFAULT_DIAL, national: trimmed.replace(/\D/g, '') };
// }

// export function formatIntlLandline(value?: string | null): string {
//   if (!value) return '';
//   const { dial, national } = parsePhone(value);
//   if (!national) return '';
//   return `${dial} ${national}`;
// }

// // ── Label maps (mirror the per-step web components) ─────────────────────────
// export function getBusinessTypeLabel(val: string): string {
//   const map: Record<string, string> = {
//     proprietorship: 'Proprietorship',
//     'pvt-ltd': 'Private Limited Company',
//     'partnership-firm': 'Partnership Firm',
//     llp: 'Limited Liability Partnership (LLP)',
//     unregistered: 'Unregistered',
//   };
//   return map[val] || val;
// }

// export function getCompanyIdLabel(businessType: string): string {
//   switch (businessType) {
//     case 'pvt-ltd':
//       return 'Company Identification Number (CIN)';
//     case 'partnership-firm':
//       return 'Partnership Deed Registration Number';
//     case 'llp':
//       return 'LLPIN';
//     default:
//       return 'Company ID Number';
//   }
// }

// export function getOwnershipTypeLabel(val: string): string {
//   const map: Record<string, string> = { owned: 'Owned', rented: 'Rented', lease: 'Lease' };
//   return map[val] || val;
// }

// export function getEmployeeCountLabel(val: string): string {
//   const map: Record<string, string> = {
//     '10-20': '10–20 employees',
//     '20-50': '20–50 employees',
//     '50-100': '50–100 employees',
//     '100+': 'More than 100 employees',
//   };
//   return map[val] || val;
// }

// // Owner designation code → label (mirrors frontend/src/lib/utils.ts
// // resolveOwnerDesignation). Falls through to the raw value for custom/unknown
// // strings so old data or free-typed entries still render as-is.
// const OWNER_DESIGNATION_LABEL: Record<string, string> = {
//   proprietor: 'Proprietor',
//   ceo: 'CEO',
//   director: 'Director',
//   'managing-director': 'Managing Director',
//   founder: 'Founder',
//   other: 'Other',
// };
// export function resolveOwnerDesignation(value?: string | null): string {
//   if (!value) return '';
//   return OWNER_DESIGNATION_LABEL[value] ?? value;
// }

// // ── Country flags (mirrors web VI_Step7 withFlags) ──────────────────────────
// // Country name → ISO2 for common countries so we can render a flag image via
// // flagcdn. Unmappable names fall back to a plain (flag-less) chip.
// export const COUNTRY_ISO: Record<string, string> = {
//   India: 'IN', 'United States': 'US', 'United States of America': 'US',
//   'United Kingdom': 'GB', China: 'CN', Germany: 'DE', France: 'FR', Italy: 'IT',
//   Spain: 'ES', Canada: 'CA', Australia: 'AU', Japan: 'JP', Bangladesh: 'BD',
//   Pakistan: 'PK', 'Sri Lanka': 'LK', Nepal: 'NP', 'United Arab Emirates': 'AE',
//   'Saudi Arabia': 'SA', Singapore: 'SG', Malaysia: 'MY', Thailand: 'TH',
//   Vietnam: 'VN', Indonesia: 'ID', Netherlands: 'NL', Belgium: 'BE',
//   Switzerland: 'CH', Sweden: 'SE', Norway: 'NO', Denmark: 'DK', Poland: 'PL',
//   Turkey: 'TR', Russia: 'RU', Brazil: 'BR', Mexico: 'MX', 'South Africa': 'ZA',
//   Egypt: 'EG', Nigeria: 'NG', Kenya: 'KE', 'South Korea': 'KR',
//   'New Zealand': 'NZ', Ireland: 'IE', Portugal: 'PT', Austria: 'AT',
//   Greece: 'GR', Israel: 'IL', Qatar: 'QA', Kuwait: 'KW', Bahrain: 'BH',
//   Oman: 'OM', 'Hong Kong': 'HK', Taiwan: 'TW', Philippines: 'PH',
// };

// export interface FlagItem {
//   flagIso: string;
//   label: string;
// }

// // Map country names → { flagIso, label } objects the list renderer understands.
// export function withFlags(countries: string[]): FlagItem[] {
//   return (Array.isArray(countries) ? countries : []).map((name) => ({
//     flagIso: COUNTRY_ISO[name] || '',
//     label: name,
//   }));
// }

// // Append a unit if the value is a plain number (no letters already present).
// export function withUnit(val: any, unit?: string): any {
//   if (!val || !unit) return val;
//   const s = String(val).trim();
//   if (/[a-zA-Z]/.test(s)) return s;
//   return `${s} ${unit}`;
// }

// // Manufacturing facility metadata — mirrors VI_Step5_Manufacturing FACILITY_META.
// export const FACILITY_META: Record<
//   string,
//   { label: string; detailFields: Array<{ key: string; label: string; unit?: string }> }
// > = {
//   spinning: {
//     label: 'Spinning',
//     detailFields: [
//       { key: 'spinningMachines', label: 'Number of Machines', unit: 'Machines' },
//       { key: 'spinningCapacity', label: 'Daily Capacity', unit: 'Kg / Day' },
//       { key: 'remarks', label: 'Remarks' },
//     ],
//   },
//   weaving: {
//     label: 'Weaving',
//     detailFields: [
//       // `loomCount` is a legacy field key — the form labels it "Number of
//       // Machines" like every other facility; don't surface "looms" wording.
//       { key: 'loomCount', label: 'Number of Machines', unit: 'Machines' },
//       { key: 'weavingCapacity', label: 'Daily Capacity', unit: 'Kg / Day' },
//       { key: 'remarks', label: 'Remarks' },
//     ],
//   },
//   dyeing: {
//     label: 'Dyeing',
//     detailFields: [
//       { key: 'dyeingMachines', label: 'Number of Machines', unit: 'Machines' },
//       { key: 'dyeingCapacity', label: 'Daily Capacity', unit: 'Kg / Day' },
//       { key: 'remarks', label: 'Remarks' },
//     ],
//   },
//   printing: {
//     label: 'Printing',
//     detailFields: [
//       { key: 'printingMachines', label: 'Number of Machines', unit: 'Machines' },
//       { key: 'printingCapacity', label: 'Daily Capacity', unit: 'Kg / Day' },
//       { key: 'remarks', label: 'Remarks' },
//     ],
//   },
//   stitching: {
//     label: 'Stitching',
//     detailFields: [
//       { key: 'stitchingMachines', label: 'Number of Machines', unit: 'Machines' },
//       { key: 'stitchingCapacity', label: 'Daily Capacity', unit: 'Pieces / Day' },
//       { key: 'remarks', label: 'Remarks' },
//     ],
//   },
//   finishing: {
//     // Form name for this stage — "Finishing" alone doesn't match what the
//     // vendor selected on the Manufacturing Facilities step.
//     label: 'Final Packing and Dispatch',
//     detailFields: [
//       { key: 'finishingCapacity', label: 'Daily Capacity', unit: 'Pieces / Day' },
//       { key: 'remarks', label: 'Remarks' },
//     ],
//   },
// };

// // ── Document URL / proxy logic (mirrors DocViewerModal.getProxyUrl) ─────────
// // PDFs / non-image docs hosted on Cloudinary are routed through the backend
// // document-proxy; everything else opens directly.
// const DOC_EXT = /\.(pdf|docx?|xlsx?|pptx?|txt|csv|rtf)(\?|$)/i;

// export function isImageUrl(url?: string, name?: string): boolean {
//   if (!url) return false;
//   if (name) {
//     if (DOC_EXT.test(name)) return false;
//     if (/\.(png|jpe?g|gif|webp|bmp|svg)(\?|$)/i.test(name)) return true;
//   }
//   if (DOC_EXT.test(url)) return false;
//   if (/\.(png|jpe?g|gif|webp|bmp|svg)(\?|$)/i.test(url)) return true;
//   try {
//     return /\/image\/upload\//.test(new URL(url).pathname);
//   } catch {
//     return false;
//   }
// }

// export function getProxyUrl(url: string): string {
//   try {
//     if (/^res\.cloudinary\.com$/i.test(new URL(url).hostname)) {
//       const base = (process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:5000/api').replace(/\/+$/, '');
//       return `${base}/document-proxy?url=${encodeURIComponent(url)}`;
//     }
//   } catch {
//     /* non-Cloudinary: use direct URL */
//   }
//   return url;
// }

// // ── Tappable value helpers (website / phone) ────────────────────────────────
// // Vendors type websites as "example.com" or "www.example.com" as often as with
// // a scheme; Linking.openURL silently fails without one, so add https://.
// export function normalizeUrl(value: string): string {
//   const v = String(value || '').trim();
//   if (!v) return '';
//   if (/^[a-z][a-z0-9+.-]*:\/\//i.test(v) || /^mailto:/i.test(v)) return v;
//   return `https://${v.replace(/^\/+/, '')}`;
// }

// // Domain-ish string with no scheme (used to auto-detect website values).
// export function looksLikeUrl(value: string): boolean {
//   const v = String(value || '').trim();
//   if (!v || /\s/.test(v)) return false;
//   return /^(https?:\/\/)?([\w-]+\.)+[a-z]{2,}(\/|\?|$)/i.test(v);
// }

// // tel: target — strip everything but digits and a leading +, so "+91 44 1234"
// // dials correctly.
// export function telHref(value: string): string {
//   const v = String(value || '').trim();
//   const plus = v.startsWith('+') ? '+' : '';
//   const digits = v.replace(/\D/g, '');
//   return digits ? `tel:${plus}${digits}` : '';
// }

// // Enough digits to be a real number — guards against IDs/labels that merely
// // live under a phone-sounding label.
// export function looksLikePhone(value: string): boolean {
//   const digits = String(value || '').replace(/\D/g, '');
//   return digits.length >= 6 && digits.length <= 15 && /^[+\d][\d\s()+-]*$/.test(String(value).trim());
// }

// export function docFilename(url: string): string {
//   try {
//     const path = new URL(url).pathname;
//     const raw = path.split('/').pop() || 'Document';
//     return decodeURIComponent(raw.split('?')[0]);
//   } catch {
//     return 'Document';
//   }
// }


// RN port of helper functions used across the Vendor verification steps.
// Consolidates the web helpers pulled from several frontend modules:
//   - frontend/src/lib/utils.ts            -> buildFullName
//   - frontend/src/components/VendorHub/FormUI.tsx -> formatLocalLandline / formatIntlLandline / parsePhone
//   - frontend/src/lib/checkerUtils.ts     -> formatCheckerName
// Kept 1:1 with the source so display values match the web portal exactly.

import { API_BASE_URL } from '@/lib/apiBase';

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

// ── Country flags ───────────────────────────────────────────────────────────
// Every ISO 3166-1 alpha-2 territory, so no country can come back flag-less.
// Names are stored ASCII-only; accented and alternate spellings are handled by
// the alias table and the normaliser below.
const ISO_TO_COUNTRY: Record<string, string> = {
  AF: 'Afghanistan', AX: 'Aland Islands', AL: 'Albania', DZ: 'Algeria',
  AS: 'American Samoa', AD: 'Andorra', AO: 'Angola', AI: 'Anguilla',
  AQ: 'Antarctica', AG: 'Antigua and Barbuda', AR: 'Argentina', AM: 'Armenia',
  AW: 'Aruba', AU: 'Australia', AT: 'Austria', AZ: 'Azerbaijan',
  BS: 'Bahamas', BH: 'Bahrain', BD: 'Bangladesh', BB: 'Barbados',
  BY: 'Belarus', BE: 'Belgium', BZ: 'Belize', BJ: 'Benin', BM: 'Bermuda',
  BT: 'Bhutan', BO: 'Bolivia', BQ: 'Bonaire, Sint Eustatius and Saba',
  BA: 'Bosnia and Herzegovina', BW: 'Botswana', BV: 'Bouvet Island',
  BR: 'Brazil', IO: 'British Indian Ocean Territory', BN: 'Brunei',
  BG: 'Bulgaria', BF: 'Burkina Faso', BI: 'Burundi', CV: 'Cabo Verde',
  KH: 'Cambodia', CM: 'Cameroon', CA: 'Canada', KY: 'Cayman Islands',
  CF: 'Central African Republic', TD: 'Chad', CL: 'Chile', CN: 'China',
  CX: 'Christmas Island', CC: 'Cocos (Keeling) Islands', CO: 'Colombia',
  KM: 'Comoros', CG: 'Congo', CD: 'Congo, Democratic Republic of the',
  CK: 'Cook Islands', CR: 'Costa Rica', CI: "Cote d'Ivoire", HR: 'Croatia',
  CU: 'Cuba', CW: 'Curacao', CY: 'Cyprus', CZ: 'Czechia', DK: 'Denmark',
  DJ: 'Djibouti', DM: 'Dominica', DO: 'Dominican Republic', EC: 'Ecuador',
  EG: 'Egypt', SV: 'El Salvador', GQ: 'Equatorial Guinea', ER: 'Eritrea',
  EE: 'Estonia', SZ: 'Eswatini', ET: 'Ethiopia', FK: 'Falkland Islands',
  FO: 'Faroe Islands', FJ: 'Fiji', FI: 'Finland', FR: 'France',
  GF: 'French Guiana', PF: 'French Polynesia', TF: 'French Southern Territories',
  GA: 'Gabon', GM: 'Gambia', GE: 'Georgia', DE: 'Germany', GH: 'Ghana',
  GI: 'Gibraltar', GR: 'Greece', GL: 'Greenland', GD: 'Grenada',
  GP: 'Guadeloupe', GU: 'Guam', GT: 'Guatemala', GG: 'Guernsey', GN: 'Guinea',
  GW: 'Guinea-Bissau', GY: 'Guyana', HT: 'Haiti',
  HM: 'Heard Island and McDonald Islands', VA: 'Holy See', HN: 'Honduras',
  HK: 'Hong Kong', HU: 'Hungary', IS: 'Iceland', IN: 'India', ID: 'Indonesia',
  IR: 'Iran', IQ: 'Iraq', IE: 'Ireland', IM: 'Isle of Man', IL: 'Israel',
  IT: 'Italy', JM: 'Jamaica', JP: 'Japan', JE: 'Jersey', JO: 'Jordan',
  KZ: 'Kazakhstan', KE: 'Kenya', KI: 'Kiribati', KP: 'North Korea',
  KR: 'South Korea', KW: 'Kuwait', KG: 'Kyrgyzstan', LA: 'Laos', LV: 'Latvia',
  LB: 'Lebanon', LS: 'Lesotho', LR: 'Liberia', LY: 'Libya',
  LI: 'Liechtenstein', LT: 'Lithuania', LU: 'Luxembourg', MO: 'Macao',
  MG: 'Madagascar', MW: 'Malawi', MY: 'Malaysia', MV: 'Maldives', ML: 'Mali',
  MT: 'Malta', MH: 'Marshall Islands', MQ: 'Martinique', MR: 'Mauritania',
  MU: 'Mauritius', YT: 'Mayotte', MX: 'Mexico', FM: 'Micronesia',
  MD: 'Moldova', MC: 'Monaco', MN: 'Mongolia', ME: 'Montenegro',
  MS: 'Montserrat', MA: 'Morocco', MZ: 'Mozambique', MM: 'Myanmar',
  NA: 'Namibia', NR: 'Nauru', NP: 'Nepal', NL: 'Netherlands',
  NC: 'New Caledonia', NZ: 'New Zealand', NI: 'Nicaragua', NE: 'Niger',
  NG: 'Nigeria', NU: 'Niue', NF: 'Norfolk Island', MK: 'North Macedonia',
  MP: 'Northern Mariana Islands', NO: 'Norway', OM: 'Oman', PK: 'Pakistan',
  PW: 'Palau', PS: 'Palestine', PA: 'Panama', PG: 'Papua New Guinea',
  PY: 'Paraguay', PE: 'Peru', PH: 'Philippines', PN: 'Pitcairn', PL: 'Poland',
  PT: 'Portugal', PR: 'Puerto Rico', QA: 'Qatar', RE: 'Reunion',
  RO: 'Romania', RU: 'Russia', RW: 'Rwanda', BL: 'Saint Barthelemy',
  SH: 'Saint Helena', KN: 'Saint Kitts and Nevis', LC: 'Saint Lucia',
  MF: 'Saint Martin', PM: 'Saint Pierre and Miquelon',
  VC: 'Saint Vincent and the Grenadines', WS: 'Samoa', SM: 'San Marino',
  ST: 'Sao Tome and Principe', SA: 'Saudi Arabia', SN: 'Senegal',
  RS: 'Serbia', SC: 'Seychelles', SL: 'Sierra Leone', SG: 'Singapore',
  SX: 'Sint Maarten', SK: 'Slovakia', SI: 'Slovenia', SB: 'Solomon Islands',
  SO: 'Somalia', ZA: 'South Africa',
  GS: 'South Georgia and the South Sandwich Islands', SS: 'South Sudan',
  ES: 'Spain', LK: 'Sri Lanka', SD: 'Sudan', SR: 'Suriname',
  SJ: 'Svalbard and Jan Mayen', SE: 'Sweden', CH: 'Switzerland', SY: 'Syria',
  TW: 'Taiwan', TJ: 'Tajikistan', TZ: 'Tanzania', TH: 'Thailand',
  TL: 'Timor-Leste', TG: 'Togo', TK: 'Tokelau', TO: 'Tonga',
  TT: 'Trinidad and Tobago', TN: 'Tunisia', TR: 'Turkiye', TM: 'Turkmenistan',
  TC: 'Turks and Caicos Islands', TV: 'Tuvalu', UG: 'Uganda', UA: 'Ukraine',
  AE: 'United Arab Emirates', GB: 'United Kingdom', US: 'United States',
  UM: 'United States Minor Outlying Islands', UY: 'Uruguay', UZ: 'Uzbekistan',
  VU: 'Vanuatu', VE: 'Venezuela', VN: 'Vietnam',
  VG: 'Virgin Islands (British)', VI: 'Virgin Islands (U.S.)',
  WF: 'Wallis and Futuna', EH: 'Western Sahara', YE: 'Yemen', ZM: 'Zambia',
  ZW: 'Zimbabwe',
};

// Alternate spellings, former names, and the informal names vendors actually
// type into the form.
const COUNTRY_ALIASES: Record<string, string> = {
  'United States of America': 'US', USA: 'US', 'U.S.A.': 'US', 'U.S.': 'US',
  America: 'US', 'United States (USA)': 'US',
  UK: 'GB', 'Great Britain': 'GB', Britain: 'GB', England: 'GB',
  Scotland: 'GB', Wales: 'GB', 'Northern Ireland': 'GB',
  'United Kingdom of Great Britain and Northern Ireland': 'GB',
  UAE: 'AE', Emirates: 'AE', Dubai: 'AE', 'Abu Dhabi': 'AE',
  'Korea, Republic of': 'KR', 'Republic of Korea': 'KR', Korea: 'KR',
  'Korea, Democratic People\u2019s Republic of': 'KP',
  "Korea, Democratic People's Republic of": 'KP',
  'Russian Federation': 'RU', 'Viet Nam': 'VN',
  'Ivory Coast': 'CI', "Cote D'Ivoire": 'CI', 'C\u00f4te d\u2019Ivoire': 'CI',
  'C\u00f4te d\u0027Ivoire': 'CI',
  'Cape Verde': 'CV', Swaziland: 'SZ', Macedonia: 'MK', 'Republic of Macedonia': 'MK',
  Burma: 'MM', 'Czech Republic': 'CZ', Holland: 'NL',
  'The Netherlands': 'NL', "Lao People's Democratic Republic": 'LA',
  'Syrian Arab Republic': 'SY', 'Iran, Islamic Republic of': 'IR',
  'Bolivia, Plurinational State of': 'BO',
  'Venezuela, Bolivarian Republic of': 'VE',
  'Tanzania, United Republic of': 'TZ', 'Moldova, Republic of': 'MD',
  'Brunei Darussalam': 'BN', 'Palestine, State of': 'PS',
  'Palestinian Territory': 'PS', 'Vatican City': 'VA', 'Vatican': 'VA',
  'DR Congo': 'CD', 'DRC': 'CD', 'Congo-Kinshasa': 'CD',
  'Democratic Republic of the Congo': 'CD', Zaire: 'CD',
  'Congo-Brazzaville': 'CG', 'Republic of the Congo': 'CG',
  'East Timor': 'TL', 'Hong Kong SAR': 'HK', 'Hong Kong SAR China': 'HK',
  Macau: 'MO', 'Macao SAR': 'MO', 'Chinese Taipei': 'TW',
  'Taiwan, Province of China': 'TW', Turkey: 'TR', 'T\u00fcrkiye': 'TR',
  'Cabo Verde Islands': 'CV', '\u00c5land Islands': 'AX',
  'Cura\u00e7ao': 'CW', 'R\u00e9union': 'RE', 'Saint Barth\u00e9lemy': 'BL',
  'St. Kitts and Nevis': 'KN', 'St. Lucia': 'LC', 'St. Martin': 'MF',
  'St. Vincent and the Grenadines': 'VC', 'St. Helena': 'SH',
  'Sao Tome & Principe': 'ST', 'Trinidad & Tobago': 'TT',
  'Antigua & Barbuda': 'AG', 'Bosnia & Herzegovina': 'BA',
  'British Virgin Islands': 'VG', 'U.S. Virgin Islands': 'VI',
  'Falkland Islands (Malvinas)': 'FK', 'Myanmar (Burma)': 'MM',
  'South Korea (ROK)': 'KR',
};

// Name → ISO2. Built from the canonical list plus the aliases, so existing
// callers that index this directly keep working.
export const COUNTRY_ISO: Record<string, string> = (() => {
  const out: Record<string, string> = {};
  for (const iso of Object.keys(ISO_TO_COUNTRY)) out[ISO_TO_COUNTRY[iso]] = iso;
  for (const name of Object.keys(COUNTRY_ALIASES)) out[name] = COUNTRY_ALIASES[name];
  return out;
})();

// Strip accents without relying on String.normalize, which isn't guaranteed on
// every JS engine the app ships against.
const DIACRITICS: Record<string, string> = {
  '\u00e0': 'a', '\u00e1': 'a', '\u00e2': 'a', '\u00e3': 'a', '\u00e4': 'a', '\u00e5': 'a',
  '\u00e7': 'c', '\u00e8': 'e', '\u00e9': 'e', '\u00ea': 'e', '\u00eb': 'e',
  '\u00ec': 'i', '\u00ed': 'i', '\u00ee': 'i', '\u00ef': 'i', '\u00f1': 'n',
  '\u00f2': 'o', '\u00f3': 'o', '\u00f4': 'o', '\u00f5': 'o', '\u00f6': 'o', '\u00f8': 'o',
  '\u00f9': 'u', '\u00fa': 'u', '\u00fb': 'u', '\u00fc': 'u', '\u00fd': 'y', '\u00ff': 'y',
};

// Case, punctuation, accents, a leading "the", and stray whitespace are all
// noise for matching purposes.
function normalizeCountry(value: string): string {
  let s = String(value || '').toLowerCase();
  s = s.replace(/[\u00e0-\u00ff]/g, (ch) => DIACRITICS[ch] || ch);
  s = s.replace(/[^a-z0-9]+/g, ' ').trim();
  s = s.replace(/^the /, '');
  return s;
}

const NORMALIZED_ISO: Record<string, string> = (() => {
  const out: Record<string, string> = {};
  for (const name of Object.keys(COUNTRY_ISO)) out[normalizeCountry(name)] = COUNTRY_ISO[name];
  return out;
})();

// Resolve any spelling — full name, alias, or a bare ISO2 code — to ISO2.
// Returns '' only for something genuinely unrecognisable.
export function resolveCountryIso(value?: string | null): string {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const upper = raw.toUpperCase();
  if (/^[A-Z]{2}$/.test(upper) && ISO_TO_COUNTRY[upper]) return upper;
  return NORMALIZED_ISO[normalizeCountry(raw)] || '';
}

export interface FlagItem {
  flagIso: string;
  label: string;
}

// Map country names → { flagIso, label } objects the list renderer understands.
export function withFlags(countries: string[]): FlagItem[] {
  return (Array.isArray(countries) ? countries : []).map((name) => ({
    flagIso: resolveCountryIso(name),
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

/**
 * Area / capacity formatting — port of the web `formatSqFt` (frontend/src/lib/units.ts).
 *
 * `factorySize` / `warehouseSize` are stored WITH the unit baked in ("3000 sq ft"),
 * but legacy rows hold a bare number and vendors type the unit every which way
 * ("3000sqft", "3000 SQ.FT."). Appending blindly produced "3000 sq ft sq ft";
 * `withUnit` avoids that but leaves the odd spellings untouched. This strips any
 * existing suffix and re-appends exactly one "sq ft", so every row reads the same.
 */
export function formatSqFt(value?: string | number | null): string {
  if (value === null || value === undefined) return '';
  const s = String(value).trim();
  if (!s) return '';
  const num = s.replace(/\s*sq\.?\s*ft\.?\s*$/i, '').trim();
  if (!num) return '';
  return `${num} sq ft`;
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
      const base = API_BASE_URL || 'http://10.0.2.2:5000/api';
      return `${base}/document-proxy?url=${encodeURIComponent(url)}`;
    }
  } catch {
    /* non-Cloudinary: use direct URL */
  }
  return url;
}

// ── Tappable value helpers (website / phone) ────────────────────────────────
// Vendors type websites as "example.com" or "www.example.com" as often as with
// a scheme; Linking.openURL silently fails without one, so add https://.
export function normalizeUrl(value: string): string {
  const v = String(value || '').trim();
  if (!v) return '';
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(v) || /^mailto:/i.test(v)) return v;
  return `https://${v.replace(/^\/+/, '')}`;
}

// Domain-ish string with no scheme (used to auto-detect website values).
export function looksLikeUrl(value: string): boolean {
  const v = String(value || '').trim();
  if (!v || /\s/.test(v)) return false;
  return /^(https?:\/\/)?([\w-]+\.)+[a-z]{2,}(\/|\?|$)/i.test(v);
}

// tel: target — strip everything but digits and a leading +, so "+91 44 1234"
// dials correctly.
export function telHref(value: string): string {
  const v = String(value || '').trim();
  const plus = v.startsWith('+') ? '+' : '';
  const digits = v.replace(/\D/g, '');
  return digits ? `tel:${plus}${digits}` : '';
}

// Enough digits to be a real number — guards against IDs/labels that merely
// live under a phone-sounding label.
export function looksLikePhone(value: string): boolean {
  const digits = String(value || '').replace(/\D/g, '');
  return digits.length >= 6 && digits.length <= 15 && /^[+\d][\d\s()+-]*$/.test(String(value).trim());
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