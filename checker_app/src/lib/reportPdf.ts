// checker_app/src/lib/reportPdf.ts
//
// Expo-print PDF generator for QC inspection reports, ported from the web QC
// portal so the app produces the SAME content, section order and branding.
//
// Web sources of truth:
//   frontend/src/lib/factoryInspectionReportPdf.ts   (factory sections A..L)
//   frontend/src/lib/productInspectionReportPdf.ts   (product sections)
//   frontend/src/lib/reportPdfDownload.ts             (canonical vs internal variants,
//                                                       M2C header/footer, signature page,
//                                                       INTERNAL REVIEW COPY banner)
//
// Public API (contract — imported by other workstreams, do not change):
//   export type ReportVariant = 'canonical' | 'internal';
//   export async function downloadFactoryReportPdf(report, opts?): Promise<void>;
//   export async function downloadProductReportPdf(report, opts?): Promise<void>;
//
// Implementation: build HTML -> Print.printToFileAsync -> rename via expo-file-system
// (so the shared filename incl. the "(Internal)" suffix is preserved) -> Sharing.shareAsync.

import { Alert } from 'react-native';
import { matchedAddressLabel } from '@/lib/inspectionSchedule';
import { computeInspectionDurations, formatDuration } from '@/lib/inspectionDuration';

// Native modules are lazy-required so importing this file never crashes in
// Expo Go / stale dev builds. Callers get a friendly rebuild prompt instead.
let Print: any = null;
let Sharing: any = null;
try {
  Print = require('expo-print');
  Sharing = require('expo-sharing');
} catch {
  /* handled in ensureNativeModules() */
}

export type ReportVariant = 'canonical' | 'internal';

export interface ReportPdfOptions {
  variant?: ReportVariant;
  /** Full name of the QC checker — populates the canonical signature page. */
  checkerName?: string;
  /**
   * Generate the file and open the native print/preview dialog instead of the
   * share sheet. Used by the "Preview" action (mirrors web's PDFPreviewModal).
   */
  preview?: boolean;
}

// ── Small helpers ──────────────────────────────────────────────────────────
const esc = (s?: unknown): string => {
  if (s === null || s === undefined) return '—';
  const str = String(s).trim();
  if (str === '') return '—';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
};

const blank = (v: unknown): boolean =>
  v === null || v === undefined || (typeof v === 'string' && v.trim() === '');

const val = (v: unknown): string => {
  if (blank(v)) return '—';
  if (Array.isArray(v)) return v.length === 0 ? '—' : v.join(', ');
  if (typeof v === 'boolean') return v ? 'Yes' : 'No';
  return String(v).trim();
};

const fmtDate = (v: unknown): string => {
  if (blank(v)) return '—';
  const s = String(v).trim();
  const m = s.match(/^(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : s;
};

const buildName = (...parts: (string | undefined | null)[]): string =>
  parts.filter(Boolean).join(' ').trim();

const safeFilePart = (s: string): string => (s || 'Report').replace(/[^a-zA-Z0-9]/g, '_');

// ── Label maps (mirror the web) ─────────────────────────────────────────────
const BUSINESS_TYPE: Record<string, string> = {
  proprietorship: 'Proprietorship',
  'pvt-ltd': 'Private Limited Company',
  'partnership-firm': 'Partnership Firm',
  llp: 'Limited Liability Partnership (LLP)',
  unregistered: 'Unregistered',
};
const OWNERSHIP_TYPE: Record<string, string> = { owned: 'Owned', rented: 'Rented', lease: 'Lease' };
const EMPLOYEE_COUNT: Record<string, string> = {
  '10-20': '10–20 employees', '20-50': '20–50 employees',
  '50-100': '50–100 employees', '100+': 'More than 100 employees',
};
const FACILITY_LABELS: Record<string, string> = {
  spinning: 'Spinning', weaving: 'Weaving', dyeing: 'Dyeing',
  printing: 'Printing', stitching: 'Stitching', finishing: 'Finishing',
};

// Packaging remark-code labels (1–10) — mirror the product report detail screen.
const REMARK_CODE_LABELS: Record<number, string> = {
  1: 'Critical Defect', 2: 'Major Defect', 3: 'Functional Fail',
  4: 'Safety Issue', 5: 'Non-Conformance', 6: 'Minor Issue',
  7: 'Re-inspection', 8: 'Acceptable', 9: 'Good', 10: 'Excellent',
};

// productVerifications key → clean label (handles both "pv_front_view" and
// "pvFrontView"); mirrors the web PDF's humanizer.
const humanizePvKey = (key: string): string =>
  key
    .replace(/^pv_/i, '')
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();

// Full form when known; otherwise Title-Case the raw value (mirror web PDF).
const businessTypeLabel = (v?: string | null): string => {
  if (blank(v)) return '—';
  const key = String(v).trim().toLowerCase();
  return BUSINESS_TYPE[key] || key.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
};

const OWNER_DESIGNATION: Record<string, string> = {
  proprietor: 'Proprietor', ceo: 'CEO', director: 'Director',
  'managing-director': 'Managing Director', founder: 'Founder', other: 'Other',
};
const resolveOwnerDesignation = (v?: string | null): string => (!v ? '' : OWNER_DESIGNATION[v] ?? v);

// title + name (mirror web formatCheckerName).
const formatCheckerName = (c?: { title?: string | null; name?: string | null } | null): string =>
  !c ? '' : [c.title, c.name].filter(Boolean).join(' ');

// Main contact name from mainContact object or owner fields (mirror web).
const resolveContactName = (v: any): string => {
  if (!v) return '—';
  const mc = v.mainContact && typeof v.mainContact === 'object' ? v.mainContact : null;
  if (mc) {
    const parts = [mc.title, mc.firstName, mc.middleName, mc.lastName].filter(Boolean);
    return parts.length ? parts.join(' ') : mc.name || '—';
  }
  const ownerParts = [v.ownerTitle, v.ownerFirstName, v.ownerMiddleName, v.ownerLastName].filter(Boolean);
  return ownerParts.length ? ownerParts.join(' ') : v.ownerName || '—';
};

const fmtDateTime = (d: Date): string =>
  d.toLocaleString('en-US', {
    year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: true,
  });
const fmtTime = (d: Date): string =>
  d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

// Inspection Type + start/complete times + the duration breakdown, shared by
// both report builders so the factory and product PDFs read the same.
//
// Everything comes off the stored inspection payload — the backend merges
// inspectionType into it at submit — and the booked length off the assignment.
// The duration rows are dropped when time tracking produced nothing (an older
// report, or one submitted without a recorded start), rather than printing "0m"
// and implying the inspection was instantaneous.
function timingRows(opts: {
  inspectionType?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  totalPausedMs?: number;
  estimatedDuration?: string | null;
  generatedAt: Date;
}): { rows: [string, string][]; exceeded: boolean; scheduledMs: number; activeMs: number } {
  const isVirtual = String(opts.inspectionType || '').toUpperCase() === 'VIRTUAL';
  const d = computeInspectionDurations({
    startedAt: opts.startedAt,
    submittedAt: opts.completedAt,
    totalPausedMs: opts.totalPausedMs || 0,
    estimatedDuration: opts.estimatedDuration,
  });
  const rows: [string, string][] = [
    ['Inspection Type', isVirtual ? 'Virtual Inspection' : 'Physical Inspection'],
    ['Inspection Start Time', opts.startedAt ? fmtTime(new Date(opts.startedAt)) : '—'],
    ['Inspection Complete Time', fmtTime(opts.completedAt ? new Date(opts.completedAt) : opts.generatedAt)],
  ];
  if (d.totalMs > 0) {
    rows.push(
      ['Active Duration', formatDuration(d.activeMs)],
      ['Paused Duration', formatDuration(d.pausedMs)],
      [
        'Total Duration',
        `${formatDuration(d.totalMs)}${d.exceeded ? '  (exceeded scheduled duration)' : ''}`,
      ],
    );
  }
  return { rows, exceeded: d.exceeded, scheduledMs: d.scheduledMs, activeMs: d.activeMs };
}

// Red callout printed under the details table when the inspection ran long.
const overtimeNote = (scheduledMs: number, activeMs: number): string =>
  `<p style="color:#c81e1e;font-weight:700;font-size:9.5px;margin:6px 0 0">${esc(
    `⚠ Exceeded scheduled duration${
      scheduledMs ? ` (scheduled ${formatDuration(scheduledMs)})` : ''
    } — active work took ${formatDuration(activeMs)}.`,
  )}</p>`;

// A checkerLocation snapshot (backend buildLocationSnapshot) or an older
// {latitude,longitude} blob → "12.971599, 77.594566", else "Not available".
function gpsText(loc: any): string {
  const lat = loc?.checkerLatitude ?? loc?.latitude;
  const lng = loc?.checkerLongitude ?? loc?.longitude;
  return lat != null && lng != null
    ? `${Number(lat).toFixed(6)}, ${Number(lng).toFixed(6)}`
    : 'Not available';
}

function stepForKey(key: string): string {
  if (key.startsWith('certDoc_') || key.startsWith('cert_')) return 'Step 6 – Certifications';
  if (key.startsWith('vt_')) return 'Step 4 – Vendor & Products';
  if (key.startsWith('mf_')) return 'Step 5 – Manufacturing';
  if (key.startsWith('ct_')) return 'Step 7 – Contact & Trade';
  if (key.startsWith('c_')) return 'Step 1 – Company Info';
  if (key.startsWith('w_')) return 'Step 2 – Warehouse & Factory';
  if (key.startsWith('o_')) return 'Step 3 – Owner Profile';
  return 'Other';
}

/**
 * Verification key → the field name the checker saw ("c_gstNumber" → "GST
 * Number"). Mirrors the on-screen report's helper so the Issues table names the
 * field in both places instead of only naming its step.
 */
function fieldLabelForKey(key: string): string {
  const rest = key.replace(/^(certDoc_|cert_|vt_|mf_|ct_|c_|w_|o_)/, '');
  const spaced = rest.replace(/_/g, ' ').replace(/([a-z0-9])([A-Z])/g, '$1 $2');
  const WORD: Record<string, string> = {
    wh: 'Warehouse', legal: 'Legal', prod: 'Product', img: 'Image',
    cat: 'Category', photo: 'Photo', spec: 'Spec', var: 'Variant',
    std: 'Standard', dims: 'Dimensions', sku: 'SKU', uom: 'UOM',
    gst: 'GST', id: 'ID', qc: 'QC',
  };
  const words = spaced.split(/\s+/).filter(Boolean).map((w) => {
    const lower = w.toLowerCase();
    if (WORD[lower]) return WORD[lower];
    if (/^\d+$/.test(w)) return String(Number(w) + 1);
    return w.charAt(0).toUpperCase() + w.slice(1);
  });
  const deduped = words.filter((w, i) => i === 0 || w.toLowerCase() !== words[i - 1].toLowerCase());
  return deduped.join(' ') || key;
}

type VF = Record<string, { ok: boolean | null; remarks?: string }>;

function sectionStatus(vf: VF, prefixes: string[]): string {
  const relevant = Object.entries(vf).filter(([k]) => prefixes.some((p) => k.startsWith(p)));
  if (relevant.length === 0) return '';
  if (relevant.every(([, fv]) => fv.ok === true)) return 'Verified';
  if (relevant.some(([, fv]) => fv.ok === false)) return 'Issues Found';
  return 'Pending';
}

// ── Shared HTML fragments ───────────────────────────────────────────────────
/**
 * Report stylesheet — red masthead, red section rules, red-headed grid tables.
 *
 * Was defined inside the product builder while the factory report kept an older
 * look (dark banner, grey card per section, header-less two-column tables). Both
 * reports go to the same client, so they now share one stylesheet.
 */
const REPORT_STYLES = `
  * { box-sizing: border-box; }
  body { font-family: -apple-system, Helvetica, Arial, sans-serif; margin: 0; padding: 40px; color: #334155; font-size: 11px; }
  .pdf-head { background:#fff5f5; border-bottom:2px solid #e01a1b; padding:16px 40px; margin:-40px -40px 20px; display:flex; align-items:flex-start; justify-content:space-between; flex-wrap:wrap; }
  .pdf-head h1 { color:#e01a1b; font-size:20px; font-weight:700; margin:0; }
  .pdf-head .sub { color:#334155; font-size:11px; margin-top:5px; }
  .pdf-head .gen { color:#64748b; font-size:9px; white-space:nowrap; padding-top:4px; }
  .sec-title { color:#e01a1b; font-weight:700; font-size:12px; border-bottom:1.2px solid #e01a1b; padding-bottom:5px; margin:18px 0 8px; display:flex; align-items:baseline; justify-content:space-between; }
  .sec-title .status { font-size:9px; font-weight:700; }
  .wtab { width:100%; border-collapse:collapse; margin-bottom:6px; }
  .wtab th { background:#fff5f5; color:#e01a1b; border:0.7px solid #e01a1b; font-size:9px; font-weight:700; text-align:left; padding:5px 6px; text-transform:uppercase; }
  .wtab td { border:0.5px solid #e2e8f0; color:#334155; font-size:9.5px; padding:5px 6px; vertical-align:top; }
  .wtab tbody tr:nth-child(even) td { background:#f8fafc; }
  .note { color:#64748b; font-size:9px; margin:4px 0 10px; }
  .grp { font-size:10px; font-weight:700; color:#334155; margin:10px 0 4px; }
  .subhead { font-size:9px; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:0.5px; margin:12px 0 4px; }
  .inline-photo { display:flex; align-items:center; gap:12px; margin:10px 0; }
  .inline-photo img { width:90px; height:90px; object-fit:cover; border-radius:4px; border:0.5px solid #e2e8f0; }
  .inline-photo span { font-size:9px; color:#64748b; font-style:italic; }
  .thumbs { display:flex; flex-wrap:wrap; gap:10px; }
  .thumb { width:31%; }
  .thumb img { width:100%; height:110px; object-fit:cover; border:0.5px solid #e2e8f0; border-radius:4px; }
  .thumb .cap { font-size:7px; color:#64748b; margin-top:2px; word-break:break-all; }
  .sigwrap { margin-top:26px; border-top:0.7px solid #e01a1b; padding-top:16px; display:flex; gap:24px; }
  .sigcol { flex:1; }
  .sigrow { font-size:10px; margin-bottom:8px; color:#334155; }
  .wfoot { margin-top:30px; padding-top:8px; border-top:0.5px solid #eee; font-size:8px; color:#64748b; }
`;


const kvRow = (label: string, value?: unknown) =>
  `<tr><td>${esc(label)}</td><td>${esc(val(value))}</td></tr>`;

function kvSection(title: string, rows: [string, unknown][], status?: string, subheads?: string): string {
  const table = kvTable(rows);
  if (!table && !subheads) return '';
  return sectionHtml(title, status, (subheads || '') + table);
}

function statusColor(status: string): string {
  return status === 'Verified' ? '#16a34a' : status === 'Issues Found' ? '#dc2626' : '#ca8a04';
}

// ── Section composition ─────────────────────────────────────────────────────
// kvSection covers "heading + one table". Sections that interleave sub-headings,
// tables and photos (A, B, C, H in the web report) compose these three instead.
// Grid table with a red header row, matching the product report's `wtab`.
const kvTable = (rows: [string, unknown][], heads: [string, string] = ['Field', 'Value']): string => {
  const body = rows.filter(([, v]) => v !== undefined).map(([l, v]) => kvRow(l, v)).join('');
  return body
    ? `<table class="wtab"><thead><tr><th>${esc(heads[0])}</th><th>${esc(heads[1])}</th></tr></thead><tbody>${body}</tbody></table>`
    : '';
};

const subhead = (title: string): string => `<div class="subhead">${esc(title)}</div>`;

function sectionHtml(title: string, status: string | undefined, inner: string): string {
  if (!inner) return '';
  const statusHtml = status
    ? `<span class="status" style="color:${statusColor(status)}">${esc(status)}</span>`
    : '';
  return `<div class="sec-title"><span>${esc(title)}</span>${statusHtml}</div>${inner}`;
}

// A single inline photo with its caption beside it — the report's Company Logo,
// Owner Profile Photo and Main Contact Photo all render this way.
function inlinePhoto(src: unknown, caption: string): string {
  if (!src || typeof src !== 'string') return '';
  if (!(src.startsWith('http') || src.startsWith('data:image'))) return '';
  return `<div class="inline-photo"><img src="${src}" alt="${esc(caption)}"/><span>${esc(caption)}</span></div>`;
}

function photoBlock(photos: any[] | undefined | null, label: string): string {
  if (!Array.isArray(photos) || photos.length === 0) return '';
  const imgs = photos
    .map((p: any, i: number) => {
      const src = typeof p === 'string' ? p : p?.data || p?.url;
      const isImg = src && typeof src === 'string' && (src.startsWith('http') || src.startsWith('data:image'));
      const caption = (typeof p !== 'string' && (p?.label || p?.name)) || `${label} ${i + 1}`;
      // Caption under each thumbnail, as the report prints them.
      return isImg
        ? `<div class="thumb"><img src="${src}" alt="${esc(caption)}"/><div class="cap">${esc(caption)}</div></div>`
        : `<div class="thumb"><div style="height:110px;background:#f8fafc;border:0.5px dashed #cbd5e1;border-radius:4px;display:flex;align-items:center;justify-content:center;font-size:8px;color:#94a3b8;text-align:center;padding:4px">${esc(caption)}</div></div>`;
    })
    .join('');
  return `<div class="subhead">${esc(label)} (${photos.length})</div><div class="thumbs">${imgs}</div>`;
}

// ── Canonical signature page / internal banner ──────────────────────────────
function signaturePage(title: string, dateStr: string, checkerName?: string): string {
  return `
  <div style="page-break-before:always;padding-top:40px">
    <div style="text-align:center;margin-bottom:30px">
      <h2 style="font-size:18px;font-weight:700;color:#222;margin:0 0 6px">${esc(title)}</h2>
      <p style="font-size:12px;color:#888;margin:0">Authorization &amp; Sign-off</p>
    </div>
    <hr style="border:none;border-top:2px solid #222;margin:0 40px 30px" />
    <div style="padding:0 40px">
      <div style="margin-bottom:28px">
        <p style="font-size:12px;font-weight:700;margin:0 0 8px">Inspector Signature:</p>
        <p style="font-size:11px;color:#555;font-style:italic;margin:0 0 4px">Digitally signed &amp; submitted via QC Portal</p>
        <div style="border-bottom:1px solid #999;height:6px"></div>
      </div>
      <div style="margin-bottom:28px">
        <p style="font-size:12px;font-weight:700;margin:0 0 8px">Inspector Name:</p>
        <div style="border-bottom:1px solid #999;height:24px;font-size:12px;padding-top:4px">${esc(checkerName || '')}</div>
      </div>
      <div style="margin-bottom:28px">
        <p style="font-size:12px;font-weight:700;margin:0 0 8px">Date:</p>
        <div style="border-bottom:1px solid #999;height:24px;font-size:12px;padding-top:4px">${esc(dateStr)}</div>
      </div>
      <div style="margin-bottom:28px">
        <p style="font-size:12px;font-weight:700;margin:0 0 8px">Company Stamp:</p>
        <div style="border:1px dashed #bbb;height:80px;border-radius:8px"></div>
      </div>
    </div>
    <hr style="border:none;border-top:2px solid #222;margin:10px 40px 16px" />
    <div style="text-align:center;padding:0 30px">
      <p style="font-size:9px;color:#888;font-style:italic;margin:0 0 4px">This is a system-generated report. Valid only with authorized signature and company stamp.</p>
      <p style="font-size:9px;color:#888;font-style:italic;margin:0">Report generated on: ${esc(new Date().toLocaleString('en-IN'))}</p>
    </div>
  </div>`;
}

function internalBanner(checkerName?: string): string {
  const stamp = `Downloaded${checkerName ? ` by ${esc(checkerName)}` : ''} on ${esc(new Date().toLocaleString('en-IN'))}`;
  return `
  <div style="margin-top:24px;border:1px solid #c89632;background:#faf3e0;border-radius:8px;padding:10px 14px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:6px">
    <span style="font-size:11px;font-weight:700;color:#82500a">INTERNAL REVIEW COPY — not a signed record.</span>
    <span style="font-size:10px;color:#82500a">${stamp}</span>
  </div>`;
}

// ── Factory report HTML (sections A..L, web parity) ─────────────────────────
// Exported so the Documentation step can preview the report in a WebView.
// Previewing the generated PDF instead is not an option: Android's WebView has
// no PDF renderer, so a data:application/pdf source is simply blank there.
export function buildFactoryHtml(report: any, variant: ReportVariant, checkerName?: string): string {
  const fd: Record<string, any> =
    report?.itemsToInspect && !Array.isArray(report.itemsToInspect) ? report.itemsToInspect : {};
  const isNewFormat = fd && typeof fd.verifications === 'object' && fd.verifications !== null;
  const vf: VF = isNewFormat ? (fd.verifications as VF) : {};
  const v: Record<string, any> = report?.vendor || {};
  const vendorName = v.companyName || fd.vendorName || 'Report';

  let sections = '';

  if (isNewFormat) {
    // A. Company Information
    const gstDisplay = v.gstNumber
      ? val(v.gstNumber)
      : v.businessType === 'unregistered'
      ? 'Unregistered — no GST number'
      : '—';
    // Registration photos live in B as "Warehouse Images", the way the web
    // report prints them — not in a trailing section of their own.
    const factoryImgs = Array.isArray(v.documents)
      ? v.documents.filter((d: any) => d.type === 'OTHER' && d.documentUrl).map((d: any) => ({ url: d.documentUrl, name: d.name }))
      : [];

    sections += sectionHtml(
      'A. Company Information',
      sectionStatus(vf, ['c_']),
      kvTable([
        ['Company Name', v.companyName],
        ['Business Type', BUSINESS_TYPE[v.businessType] || v.businessType],
        ['GST Number', gstDisplay],
        ['PAN Number', blank(v.panNumber) ? undefined : v.panNumber],
        ['Aadhaar Number', blank(v.aadhaarNumber) ? undefined : v.aadhaarNumber],
        ['Company ID Number', blank(v.companyIdNumber) ? undefined : v.companyIdNumber],
        ['IEC Code', blank(v.iecCode) ? undefined : v.iecCode],
        ['Website', blank(v.website) ? undefined : v.website],
      ]) +
        inlinePhoto(v.companyLogo, 'Company Logo') +
        // The business phone/email pair belongs to this section in the report,
        // not to H — H carries the named contact person and the trade profile.
        subhead('Business Contact Details') +
        kvTable([
          ['Primary Phone', v.businessPhone],
          ['Secondary Phone', blank(v.phoneNumber2) ? undefined : v.phoneNumber2],
          ['Primary Email', v.businessEmail],
          ['Secondary Email', blank(v.businessEmail2) ? undefined : v.businessEmail2],
          ['Local Landline', blank(v.landlineNumber) ? undefined : v.landlineNumber],
          ['International Landline', blank(v.intlLandline) ? undefined : v.intlLandline],
        ]),
    );

    // B. Warehouse & Factory Details — legal/factory table, then the warehouse
    // table, then the registration photos.
    const legalRows: [string, unknown][] = [
      ['Ownership Type', OWNERSHIP_TYPE[v.factoryOwnershipType || v.ownershipType] || v.factoryOwnershipType || v.ownershipType],
      ['Warehousing Capacity', blank(v.factorySize) ? undefined : v.factorySize],
      ['Address Line 1', blank(v.factoryAddress) ? undefined : v.factoryAddress],
      ['Address Line 2', blank(v.addressLine2) ? undefined : v.addressLine2],
      ['Landmark', blank(v.landmark) ? undefined : v.landmark],
      ['City', blank(v.factoryCity) ? undefined : v.factoryCity],
      ['State', blank(v.factoryState) ? undefined : v.factoryState],
      ['ZIP / Postal Code', blank(v.factoryZipCode) ? undefined : v.factoryZipCode],
      ['Country', blank(v.factoryCountry) ? undefined : v.factoryCountry],
      ['Map / Location Link', blank(v.mapLink) ? undefined : v.mapLink],
    ];
    // Registration mirrors the legal address into the warehouse columns when the
    // vendor ticks "same as" — print one row saying so rather than repeating it.
    const eqAddr = (a: unknown, b: unknown) => String(a || '').trim() === String(b || '').trim();
    const sameWarehouse =
      (blank(v.warehouseAddress) && blank(v.warehouseCity)) ||
      (eqAddr(v.warehouseAddress, v.factoryAddress) &&
        eqAddr(v.warehouseCity, v.factoryCity) &&
        eqAddr(v.warehouseState, v.factoryState) &&
        eqAddr(v.warehouseZipCode, v.factoryZipCode) &&
        eqAddr(v.warehouseCountry, v.factoryCountry));
    const warehouseRows: [string, unknown][] = sameWarehouse
      ? [['Warehouse Address', 'Same as Legal Address & Factory Site above']]
      : [
          ['Ownership Type', OWNERSHIP_TYPE[v.ownershipType] || v.ownershipType],
          ['Warehousing Capacity', blank(v.warehouseSize) ? undefined : v.warehouseSize],
          ['Address Line 1', blank(v.warehouseAddress) ? undefined : v.warehouseAddress],
          ['Address Line 2', blank(v.warehouseAddressLine2) ? undefined : v.warehouseAddressLine2],
          ['Landmark', blank(v.warehouseLandmark) ? undefined : v.warehouseLandmark],
          ['City', blank(v.warehouseCity) ? undefined : v.warehouseCity],
          ['State', blank(v.warehouseState) ? undefined : v.warehouseState],
          ['ZIP / Postal Code', blank(v.warehouseZipCode) ? undefined : v.warehouseZipCode],
          ['Country', blank(v.warehouseCountry) ? undefined : v.warehouseCountry],
        ];
    sections += sectionHtml(
      'B. Warehouse & Factory Details',
      sectionStatus(vf, ['w_']),
      subhead('Legal Address & Factory Site') +
        kvTable(legalRows) +
        subhead('Warehouse Address') +
        kvTable(warehouseRows) +
        photoBlock(factoryImgs, 'Warehouse Images'),
    );

    // C. Owner Profile
    const ownerName = buildName(v.ownerTitle, v.ownerFirstName, v.ownerMiddleName, v.ownerLastName) || v.ownerName;
    sections += sectionHtml(
      'C. Owner Profile',
      sectionStatus(vf, ['o_']),
      subhead('Owner Identity') +
        kvTable([
          ['Owner Full Name', ownerName],
          ['Designation', v.designation],
          ['Primary Phone', v.ownerPhone],
          ['Secondary Phone', blank(v.ownerPhone2) ? undefined : v.ownerPhone2],
          ['Primary Email', v.ownerEmail],
          ['Secondary Email', blank(v.ownerEmail2) ? undefined : v.ownerEmail2],
          ['International Landline', blank(v.ownerIntlLandline) ? undefined : v.ownerIntlLandline],
          ['Business Start Date', fmtDate(v.businessStartDate)],
          ['Number of Employees', EMPLOYEE_COUNT[v.employeeCount] || v.employeeCount],
        ]) +
        inlinePhoto(v.ownerPhoto, 'Owner Profile Photo'),
    );

    // D. Vendor Classification
    sections += kvSection(
      'D. Vendor Classification',
      [
        ['Vendor Types', Array.isArray(v.vendorTypes) ? v.vendorTypes.map((s: any) => (typeof s === 'string' && s ? s.charAt(0).toUpperCase() + s.slice(1) : s)) : v.vendorTypes],
        ['Product Categories', v.productCategories],
        ['Category Remarks', blank(v.categoryRemarks) ? undefined : v.categoryRemarks],
        ['Quality Control Measures', blank(v.qualityControl) ? undefined : v.qualityControl],
      ],
      sectionStatus(vf, ['vt_']),
    );

    // E. Market Focus
    const hasMF =
      !blank(v.marketFocus) ||
      (Array.isArray(v.primaryMarkets) && v.primaryMarkets.length > 0) ||
      (Array.isArray(v.domesticMarkets) && v.domesticMarkets.length > 0);
    if (hasMF) {
      sections += kvSection(
        'E. Market Focus',
        [
          ['Market Focus', blank(v.marketFocus) ? undefined : v.marketFocus],
          ['Primary Markets', Array.isArray(v.primaryMarkets) && v.primaryMarkets.length ? v.primaryMarkets : undefined],
          ['Domestic Markets', Array.isArray(v.domesticMarkets) && v.domesticMarkets.length ? v.domesticMarkets : undefined],
        ],
        sectionStatus(vf, ['vt_']),
      );
    }

    // F. Manufacturing Facilities
    const enabledFacilities: Record<string, boolean> = v.enabledFacilities || {};
    const facilityDetails: Record<string, any> = v.facilityDetails || {};
    const activeFacilities = Object.keys(FACILITY_LABELS).filter((f) => enabledFacilities[f]);
    if (activeFacilities.length > 0 || !blank(v.productionCapacity)) {
      let facHtml = '';
      if (!blank(v.productionCapacity)) {
        facHtml += `<div class="subhead">Overall Production Capacity</div><table>${kvRow('Monthly Production Capacity', v.productionCapacity)}</table>`;
      }
      activeFacilities.forEach((fk) => {
        const details = facilityDetails[fk] || {};
        const rows = Object.entries(details)
          .filter(([, dv]) => !blank(dv))
          .map(([dk, dv]) => kvRow(dk.replace(/([A-Z])/g, ' $1').trim(), dv))
          .join('');
        facHtml += `<div class="subhead">${esc(FACILITY_LABELS[fk])}</div><table>${
          kvRow('Facility Status', 'Active — declared') + rows
        }</table>`;
      });
      sections += `<div class="section"><div class="sh"><span>F. Manufacturing Facilities</span><span class="status" style="color:${statusColor(
        sectionStatus(vf, ['mf_']),
      )}">${sectionStatus(vf, ['mf_'])}</span></div>${facHtml}</div>`;
    }

    // G. Certifications & Quality Control
    const certifications: any[] = Array.isArray(v.certifications) ? v.certifications : [];
    if (certifications.length > 0 || !blank(v.complianceStandards) || !blank(v.packagingCapabilities)) {
      let certHtml = '';
      if (certifications.length > 0) {
        certHtml += `${subhead('Quality Certifications')}<table class="wtab"><thead><tr><th>Certificate Name</th><th>Expiry Date</th><th>Description</th></tr></thead><tbody>${certifications
          .map((c: any) => `<tr><td>${esc(val(c.name))}</td><td>${esc(fmtDate(c.expiryDate))}</td><td>${esc(val(c.description))}</td></tr>`)
          .join('')}</tbody></table>`;
      }
      const stdTable = kvTable([
        ['Compliance Standards', blank(v.complianceStandards) ? undefined : v.complianceStandards],
        ['Packaging Capabilities', blank(v.packagingCapabilities) ? undefined : v.packagingCapabilities],
      ]);
      if (stdTable) certHtml += subhead('Standards & Packaging') + stdTable;
      sections += sectionHtml('G. Certifications & Quality Control', sectionStatus(vf, ['cert_', 'certDoc_']), certHtml);
    }

    // H. Contact & Trade Information — the named contact person, their photo,
    // then the import/export profile (business phone/email now live in A).
    const mc = v.mainContact && typeof v.mainContact === 'object' ? v.mainContact : null;
    const contactPersonHtml = mc
      ? subhead('Main Contact Person') +
        kvTable([
          ['Contact Name', resolveContactName(mc)],
          ['Designation', blank(mc.designation) ? undefined : mc.designation],
          ['Department', blank(mc.department) ? undefined : mc.department],
          ['Primary Email', blank(mc.email1 || mc.email) ? undefined : mc.email1 || mc.email],
          ['Secondary Email', blank(mc.email2) ? undefined : mc.email2],
          ['Primary Phone', blank(mc.phone1 || mc.phone) ? undefined : mc.phone1 || mc.phone],
          ['Secondary Phone', blank(mc.phone2) ? undefined : mc.phone2],
        ]) +
        inlinePhoto(mc.photo, 'Main Contact Photo')
      : '';
    const tradeRows: [string, unknown][] = [
      ['Import Experience', v.importExperience == null ? undefined : v.importExperience ? 'Yes' : 'No'],
      ['Import Countries', Array.isArray(v.importCountries) && v.importCountries.length ? v.importCountries : undefined],
      ['Export Experience', v.exportExperience == null ? undefined : v.exportExperience ? 'Yes' : 'No'],
      ['Export Countries', Array.isArray(v.exportCountries) && v.exportCountries.length ? v.exportCountries : undefined],
    ];
    const tradeHtml = tradeRows.some(([, val_]) => val_ !== undefined)
      ? subhead('Import / Export Experience') + kvTable(tradeRows)
      : '';
    const bankHtml = v.bankDetails
      ? subhead('Bank Details') +
        kvTable([
          ['Bank Name', v.bankDetails.bankName],
          ['Account Type', blank(v.bankDetails.accountType) ? undefined : v.bankDetails.accountType],
          ['IFSC Code', blank(v.bankDetails.ifscCode) ? undefined : v.bankDetails.ifscCode],
        ])
      : '';
    sections += sectionHtml(
      'H. Contact & Trade Information',
      sectionStatus(vf, ['ct_']),
      contactPersonHtml + tradeHtml + bankHtml,
    );

    // I. Verification Summary
    const allEntries = Object.entries(vf);
    const okCount = allEntries.filter(([, e]) => e.ok === true).length;
    const failCount = allEntries.filter(([, e]) => e.ok === false).length;
    const pendingCount = allEntries.filter(([, e]) => e.ok === null).length;
    const total = allEntries.length;
    const pct = total === 0 ? 0 : Math.round((okCount / total) * 100);
    sections += kvSection('I. Verification Summary', [
      ['Total Fields', String(total)],
      ['Verified OK', String(okCount)],
      ['Issues Found', String(failCount)],
      ['Pending', String(pendingCount)],
      ['Verification %', `${pct}%`],
      // Which registered address the geofence matched, and the distance. Absent on
      // a submit-time preview, which has not been verified yet.
      ...(report?.locationVerified == null
        ? []
        : ([
            [
              'Verified Site',
              report.locationVerified
                ? `${matchedAddressLabel(report.locationMatchedAddress) || 'Vendor location'}${
                    report.locationDistanceM != null ? ` — ${Math.round(report.locationDistanceM)}m away` : ''
                  }`
                : 'Not verified',
            ],
          ] as [string, string][])),
    ]);

    // J. Issues Found
    const issues = allEntries.filter(([, e]) => e.ok === false);
    if (issues.length > 0) {
      // Step | Field | Remarks, as the report prints it — the field name was
      // previously folded into the step line and effectively lost.
      const issueHtml = `<table class="wtab"><thead><tr><th>Step</th><th>Field</th><th>Remarks</th></tr></thead><tbody>${issues
        .map(
          ([k, e]) =>
            `<tr><td>${esc(stepForKey(k))}</td><td>${esc(fieldLabelForKey(k))}</td><td>${
              e.remarks ? esc(e.remarks) : '—'
            }</td></tr>`,
        )
        .join('')}</tbody></table>`;
      sections += sectionHtml('J. Issues Found', undefined, issueHtml);
    }

    // K. Inspection Details
    const generatedAt = new Date();
    const checker: Record<string, any> = report?.checker || report?.assignedQc || {};
    const timing = timingRows({
      inspectionType: fd.inspectionType || report?.inspectionType,
      startedAt: fd.inspectionStartedAt || report?.startedAt,
      completedAt: fd.inspectionCompletedAt || report?.submittedAt || report?.completedAt,
      totalPausedMs: fd.totalPausedMs ?? report?.totalPausedMs ?? 0,
      estimatedDuration: report?.estimatedDuration || report?.qcAssignment?.estimatedDuration,
      generatedAt,
    });
    const isVirtual = String(fd.inspectionType || report?.inspectionType || '').toUpperCase() === 'VIRTUAL';
    sections += kvSection('K. Inspection Details', [
      ['Inspector Name', fd.inspectorName || checkerName || checker.name],
      ['Checker ID', checker.checkerId],
      ['Inspector Email', checker.email],
      ['Inspector Phone', checker.phone || checker.mobile],
      ...timing.rows,
      ['Inspection Date', fmtDate(fd.inspectionDate)],
      ['Overall Result', fd.inspectionStatus || report?.result],
      // A virtual inspection is done remotely, so there are no coordinates to
      // report — the type row above already says why.
      ...(isVirtual
        ? []
        : ([['GPS Location', gpsText(fd.checkerLocation || fd.location || fd.gpsLocation)]] as [string, unknown][])),
      ['Inspector Remarks', fd.inspectorRemarks || report?.notes],
      ['Report Generated', generatedAt.toLocaleString('en-IN')],
    ]);
    if (timing.exceeded) sections += overtimeNote(timing.scheduledMs, timing.activeMs);

    // Inspector evidence photos. The vendor's registration photos are printed in
    // B (Warehouse Images); these are the shots the checker took on the visit,
    // so they stay a section of their own rather than being mixed in.
    const evidence = Array.isArray(fd.factoryPhotos) ? fd.factoryPhotos : [];
    if (evidence.length > 0) {
      sections += `<div class="section"><div class="sh"><span>L. Inspector Evidence Photos</span></div>${photoBlock(
        evidence,
        'Inspector Evidence Photos',
      )}</div>`;
    }
  } else {
    // ── Legacy 7-step form fallback (old app reports) ──
    const assignedItems = Array.isArray(report?.itemsToInspect) ? report.itemsToInspect : [];
    sections += `<div class="section"><div class="sh"><span>Legacy Report Format</span></div><table>${kvRow(
      'Note',
      'This inspection was submitted using the legacy form format.',
    )}</table></div>`;
    sections += kvSection('Section 1 — Factory Details', [
      ['Vendor Name', fd.vendorName],
      ['Factory Name', fd.factoryName],
      ['Factory Address', fd.factoryAddress],
      ['Contact Person', fd.contactPersonName],
      ['Contact Phone', fd.contactPhoneNumber],
    ]);
    sections += kvSection('Section 2 — Legal & Registration', [
      ['Business Reg. No.', fd.businessRegistrationNumber],
      ['GST / Tax ID', fd.gstTaxId],
      ['Factory License No.', fd.factoryLicenseNumber],
    ]);
    sections += kvSection('Section 3 — Production Info', [
      ['Products Manufactured', fd.productsManufactured],
      ['Monthly Capacity', fd.monthlyProductionCapacity],
      ['Production Workers', fd.numberOfProductionWorkers],
      ['Category to Inspect', fd.categoryToInspect],
    ]);
    sections += kvSection('Section 4 — Basic Infrastructure', [
      ['Machinery Available', fd.machineryAvailable],
      ['Electricity Available', fd.electricityAvailable],
      ['Water Available', fd.waterAvailable],
      ['Storage Area Available', fd.storageAreaAvailable],
    ]);
    sections += kvSection('Section 5 — Quality & Safety', [
      ['Quality Check Process', fd.qualityCheckProcess],
      ['Safety Equipment', fd.safetyEquipment],
      ['Clean Working Environment', fd.cleanWorkingEnvironment],
    ]);
    sections += kvSection('Section 6 — Inspection Info', [
      ['Inspection Date', fd.inspectionDate],
      ['Inspector Name', fd.inspectorName || checkerName || report?.checker?.name],
      ['Inspection Status', fd.inspectionStatus],
      ['Remarks', fd.inspectorRemarks || report?.notes],
    ]);
    if (Array.isArray(fd.factoryPhotos) && fd.factoryPhotos.length > 0) {
      sections += `<div class="section"><div class="sh"><span>Section 7 — Evidence</span></div>${photoBlock(
        fd.factoryPhotos,
        'Factory Photos',
      )}</div>`;
    }
    if (assignedItems.length > 0) {
      sections += `<div class="section"><div class="sh"><span>Items Assigned for Inspection</span></div><div style="padding:12px">${assignedItems
        .map(
          (it: any) =>
            `<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:10px 14px;margin-bottom:8px"><div style="font-weight:600">${esc(
              it.itemName,
            )}</div>${it.description ? `<div style="font-size:11px;color:#6b7280;margin-top:2px">${esc(it.description)}</div>` : ''}</div>`,
        )
        .join('')}</div>`;
    }
  }

  // Selfie verification (common)
  const selfieHtml = buildSelfieHtml(fd);

  const dateStr = report?.completedAt
    ? new Date(report.completedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })
    : new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });

  const closing =
    variant === 'canonical'
      ? signaturePage('Factory Inspection Report', dateStr, checkerName || fd.inspectorName || report?.checker?.name)
      : internalBanner(checkerName);

  // Same masthead the product report uses: red title band, "<vendor> ·
  // Inspector: <name>", generated timestamp on the right. The dark summary
  // banner is gone — its four values already appear in the sections below.
  const inspectorName = checkerName || fd.inspectorName || report?.checker?.name || '';
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${REPORT_STYLES}</style></head><body>
  <div class="pdf-head">
    <div>
      <h1>Factory Inspection Report</h1>
      <div class="sub">${esc(vendorName)}${inspectorName ? `  &middot;  Inspector: ${esc(inspectorName)}` : ''}</div>
    </div>
    <div class="gen">Generated: ${esc(fmtDateTime(new Date()))}</div>
  </div>
  ${sections}
  ${selfieHtml}
  ${closing}
  <div class="wfoot">M2C — Confidential Factory Inspection Report</div>
  </body></html>`;
}

function buildSelfieHtml(fd: any): string {
  if (!fd?.beforeSelfiePhoto && !fd?.afterSelfiePhoto) return '';
  const tiles = [
    { photo: fd.beforeSelfiePhoto, takenAt: fd.beforeSelfieTakenAt, label: 'Before Inspection' },
    { photo: fd.afterSelfiePhoto, takenAt: fd.afterSelfieTakenAt, label: 'After Inspection' },
  ]
    .map(({ photo, takenAt, label }) => {
      const src = photo?.data || photo?.url || (typeof photo === 'string' ? photo : null);
      if (!src || !String(src).startsWith('http')) return '';
      return `<div style="text-align:center">
        <img src="${src}" style="width:150px;height:180px;object-fit:cover;border-radius:12px;border:2px solid #ddd6fe" alt="${esc(label)}"/>
        <div style="font-size:11px;font-weight:700;color:#6d28d9;margin-top:6px">${esc(label)}</div>
        ${takenAt ? `<div style="font-size:10px;color:#94a3b8;margin-top:2px">${esc(new Date(takenAt).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' }))}</div>` : ''}
      </div>`;
    })
    .join('');
  if (!tiles.trim()) return '';
  return `<div class="section"><div class="sh"><span>Selfie Verification</span></div><div style="display:flex;gap:16px;padding:16px">${tiles}</div></div>`;
}

// ── Product report HTML — faithful HTML port of the web PDF ─────────────────
// Mirrors frontend/src/lib/productInspectionReportPdf.ts (sections A–J, light-
// red header band, photo counts as text, attached-document thumbnails, inline
// signature block) so the mobile download matches the web download.
function buildProductHtml(report: any, variant: ReportVariant, checkerName?: string): string {
  const fd: Record<string, any> = (report?.qcInspectionData || {}) as Record<string, any>;
  const v: Record<string, any> = fd.vendorData && typeof fd.vendorData === 'object' ? fd.vendorData : {};
  const p: Record<string, any> = fd.productData && typeof fd.productData === 'object' ? fd.productData : {};
  const checker: Record<string, any> = report?.assignedQc || (checkerName ? { name: checkerName } : {});
  const productName = report?.name || 'Product';
  const vendorName = report?.vendor?.companyName || fd.vendor || '';
  const generatedAt = new Date();
  const startTimeStr = fd.inspectionStartedAt ? fmtTime(new Date(fd.inspectionStartedAt)) : '—';
  // Fall back to "now" only when the inspection has no recorded completion time
  // — a submit-time preview, where the report is generated as it finishes.
  const completeTimeStr = fmtTime(fd.inspectionCompletedAt ? new Date(fd.inspectionCompletedAt) : generatedAt);

  // Local table helpers (web-like: light-red header, grid borders, zebra rows).
  const secTitle = (t: string) => `<div class="sec-title">${esc(t)}</div>`;
  const gridTable = (head: string[], rows: (string | number)[][]) =>
    `<table class="wtab"><thead><tr>${head
      .map((h) => `<th>${esc(h)}</th>`)
      .join('')}</tr></thead><tbody>${rows
      .map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join('')}</tr>`)
      .join('')}</tbody></table>`;
  const note = (t: string) => `<p class="note">${esc(t)}</p>`;
  const italic = (t: string) => `<p class="note"><i>${esc(t)}</i></p>`;

  let body = '';

  // ── A. General Information ──
  const generalRows: [string, string][] = [
    ['Company Name', val(v.companyName || fd.vendor || vendorName)],
    ['Business Type', businessTypeLabel(v.businessType)],
    ['Primary Phone', val(v.businessPhone)],
    ['Secondary Phone', val(v.phoneNumber2)],
    ['Primary Email', val(v.businessEmail)],
    ['Inspection Date', val(fd.serviceStartDate)],
    ['Service Type', val(fd.serviceType)],
  ].filter(([l, vv]) => !(l.startsWith('Secondary') && vv === '—')) as [string, string][];
  body += secTitle('A. General Information') + gridTable(['Field', 'Value'], generalRows);

  // ── B. Main Contact Person (only when there's data) ──
  const mc = v.mainContact && typeof v.mainContact === 'object' ? v.mainContact : null;
  const contactRows: [string, string][] = [
    ['Full Name', resolveContactName(v)],
    ['Designation', val(mc ? mc.customDesignation || mc.designation : resolveOwnerDesignation(v.designation))],
    ['Department', val(mc ? mc.customDepartment || mc.department : undefined)],
    ['Primary Phone', val(mc ? mc.phone1 || mc.phone : v.ownerPhone)],
    ['Secondary Phone', val(mc ? mc.phone2 : v.ownerPhone2)],
    ['Primary Email', val(mc ? mc.email1 || mc.email : v.ownerEmail)],
    ['Secondary Email', val(mc ? mc.email2 : v.ownerEmail2)],
  ].filter(([l, vv]) => !(l.startsWith('Secondary') && vv === '—')) as [string, string][];
  if (contactRows.some(([, vv]) => vv !== '—')) {
    body += secTitle('B. Main Contact Person') + gridTable(['Field', 'Value'], contactRows);
  }

  // ── C. Product Being Inspected ──
  if (p.name || p.category || report?.name || report?.category) {
    const productRows: [string, string][] = [
      ['Product Name', val(p.name || report?.name)],
      ['Category', val(p.category || report?.category)],
      ['Sub-Category', val(p.subCategory)],
    ].filter(([l, vv]) => !(l === 'Sub-Category' && vv === '—')) as [string, string][];
    body += secTitle('C. Product Being Inspected') + gridTable(['Field', 'Value'], productRows);
  }

  // ── D. Product Verification ──
  body += secTitle('D. Product Verification');
  const verEntries = Object.entries(fd.productVerifications || {});
  if (verEntries.length === 0) {
    body += italic('No product fields were verified.');
  } else {
    const rows = verEntries.map(([key, e]: [string, any]) => [
      humanizePvKey(key),
      e?.ok === true ? 'Verified' : e?.ok === false ? 'Not Verified' : 'Not Checked',
      val(e?.remarks),
    ]);
    body += gridTable(['Field', 'Status', 'Remarks'], rows);
  }
  const evCount = (fd.productEvidencePhotos || []).length;
  if (evCount > 0) body += note(`Photo Evidence: ${evCount} photo(s) attached`);

  // ── E. Packaging Inspection ──
  body += secTitle('E. Packaging Inspection');
  const pkgItems: any[] = Array.isArray(fd.packagingItems) ? fd.packagingItems : [];
  if (pkgItems.length === 0) {
    body += italic('No packaging items recorded.');
  } else {
    const rows = pkgItems.map((item: any) => {
      const code = item.remarkCode != null ? `${item.remarkCode} — ${REMARK_CODE_LABELS[item.remarkCode] || ''}` : '—';
      return [
        (item.label || '').split('—')[0].trim(),
        item.verified === true ? 'Yes' : item.verified === false ? 'No' : '—',
        code,
        val(item.remarks),
      ];
    });
    body += gridTable(['Item', 'Inspected', 'Remark Code', 'Remarks'], rows);
  }
  const pkgCount = (fd.packagingPhotos || []).length;
  if (pkgCount > 0) body += note(`Packaging Photos: ${pkgCount} photo(s) attached`);

  // ── F. Defects — AQL Summary ──
  body += secTitle('F. Defects — AQL Summary');
  body += gridTable(['Field', 'Value'], [
    ['Inspection Level', val(fd.inspectionLevel)],
    ['Sample Size', val(fd.sampleSize)],
    ['AQL Critical', val(fd.aqlCritical)],
    ['AQL Major', val(fd.aqlMajor)],
    ['AQL Minor', val(fd.aqlMinor)],
  ]);
  body += gridTable(['Severity', 'Found', 'Max Allowed', 'Details'], [
    ['Critical', String(fd.criticalDefects ?? 0), String(fd.maxAllowedCritical ?? 0), val(fd.criticalDefectDetails)],
    ['Major', String(fd.majorDefects ?? 0), String(fd.maxAllowedMajor ?? 0), val(fd.majorDefectDetails)],
    ['Minor', String(fd.minorDefects ?? 0), String(fd.maxAllowedMinor ?? 0), val(fd.minorDefectDetails)],
  ]);
  const defCount = (fd.defectPhotos || []).length;
  if (defCount > 0) body += note(`Defect Photos: ${defCount} photo(s) attached`);

  // ── G. Testing ──
  const testGroups: any[] = Array.isArray(fd.testGroups) ? fd.testGroups : [];
  if (testGroups.length > 0) {
    body += secTitle('G. Testing');
    for (const group of testGroups) {
      const tests: any[] = Array.isArray(group.tests) ? group.tests : [];
      const gPass = tests.filter((t) => t.pass).length;
      const gFail = tests.filter((t) => t.fail).length;
      body += `<div class="grp">${esc(group.label || 'Group')}  (${gPass} passed, ${gFail} failed)</div>`;
      const rows = tests.map((t: any) => [
        t.isOther
          ? `${val(t.label || t.subject)}${t.subject && t.label ? ` (${t.subject})` : ''}  [Custom]`
          : val(t.label),
        t.pass === true ? 'Pass' : t.fail === true ? 'Fail' : '—',
        val(t.remarks),
        String((t.rightPhotos || []).length),
        String((t.wrongPhotos || []).length),
      ]);
      body += gridTable(['Test', 'Result', 'Remarks', 'Pass Photos', 'Fail Photos'], rows);
    }
    const additionalEvidence: Record<string, any[]> = fd.additionalEvidence || {};
    const evRows = Object.entries(additionalEvidence)
      .filter(([, photos]) => Array.isArray(photos) && photos.length > 0)
      .map(([key, photos]) => [key.replace(/_/g, ' '), `${(photos as any[]).length} photo(s)`]);
    if (evRows.length > 0) {
      body += `<div class="grp">Additional Evidence</div>` + gridTable(['Category', 'Photos'], evRows);
    }
  }

  // ── H. Inspector Details ──
  const timing = timingRows({
    inspectionType: fd.inspectionType,
    startedAt: fd.inspectionStartedAt,
    completedAt: fd.inspectionCompletedAt,
    totalPausedMs: fd.totalPausedMs ?? 0,
    estimatedDuration: report?.qcAssignment?.estimatedDuration,
    generatedAt,
  });
  const isVirtual = String(fd.inspectionType || '').toUpperCase() === 'VIRTUAL';
  body += secTitle('H. Inspector Details');
  body += gridTable(['Field', 'Value'], [
    ['Inspector Name', val(formatCheckerName(checker) || fd.inspectorSignature)],
    ['Checker ID', val(checker.checkerId)],
    ['Email', val(checker.email)],
    ['Phone', val(checker.phone)],
    ['Inspection Date', val(fd.serviceStartDate)],
    ...timing.rows,
    ['Inspection Status', val(fd.inspectionStatus)],
    // A virtual inspection is done remotely, so there are no coordinates to
    // report — the type row above already says why.
    ...(isVirtual
      ? []
      : ([['GPS Location', gpsText(fd.checkerLocation || fd.location || fd.gpsLocation)]] as [string, string][])),
    // Which registered address the geofence matched, and how far away the checker
    // stood. Only present on stored reports — a submit-time preview has not been
    // verified yet, so the row is dropped rather than shown as "Not verified".
    ...(report?.locationVerified == null
      ? []
      : [
          [
            'Verified Site',
            report.locationVerified
              ? `${matchedAddressLabel(report.locationMatchedAddress) || 'Vendor location'}${
                  report.locationDistanceM != null ? ` — ${Math.round(report.locationDistanceM)}m away` : ''
                }`
              : 'Not verified',
          ] as [string, string],
        ]),
    ['Report Generated', fmtDateTime(generatedAt)],
  ]);
  if (timing.exceeded) body += overtimeNote(timing.scheduledMs, timing.activeMs);

  // ── J. Attached Documents (thumbnails) ──
  const docImages: any[] = [
    ...(Array.isArray(fd.documentationPhotos) ? fd.documentationPhotos : []),
    ...(Array.isArray(fd.signedDocuments) ? fd.signedDocuments : []),
  ].filter((d: any) => d && (d.data || d.url) && !d.isPdf);
  if (docImages.length > 0) {
    body += secTitle('J. Attached Documents');
    body += `<div class="thumbs">${docImages
      .map(
        (img: any) =>
          `<div class="thumb"><img src="${img.data || img.url}" alt="${esc(
            String(img.name || 'document'),
          )}"/><div class="cap">${esc(String(img.name || 'document').slice(0, 30))}</div></div>`,
      )
      .join('')}</div>`;
  }

  // ── Signature block (inline, matches web) ──
  const statusColors: Record<string, string> = {
    Approved: '#16a34a', Rejected: '#dc2626', 'On Hold': '#ca8a04', 'Re-Inspection': '#ea580c',
  };
  const status = fd.inspectionStatus;
  const sig = fd.clientSignature && String(fd.clientSignature).startsWith('http') ? fd.clientSignature : null;
  const sigBlock = `
  <div class="sigwrap">
    <div class="sigcol">
      <div class="sigrow"><b>Inspector:</b> ${esc(val(formatCheckerName(checker) || fd.inspectorSignature))}</div>
      <div class="sigrow"><b>Inspection Date:</b> ${esc(val(fd.serviceStartDate))}</div>
      <div class="sigrow"><b>Inspection Start Time:</b> ${esc(startTimeStr)}</div>
      <div class="sigrow"><b>Inspection Complete Time:</b> ${esc(completeTimeStr)}</div>
      ${status ? `<div class="sigrow" style="margin-top:6px;font-weight:700;color:${statusColors[status] || '#334155'}">Status: ${esc(status)}</div>` : ''}
    </div>
    <div class="sigcol">
      ${
        sig
          ? `<div class="sigrow"><b>Client Signature:</b></div><img src="${sig}" style="height:50px;object-fit:contain;margin-top:6px" alt="Client signature"/><div style="font-size:9px;color:#64748b;font-style:italic;margin-top:4px">Digitally signed &middot; ${esc(fmtDateTime(generatedAt))}</div>`
          : `<div class="sigrow"><b>Client Signature &amp; Seal:</b></div><div style="border-bottom:1px solid #94a3b8;height:44px;margin-top:24px"></div>`
      }
    </div>
  </div>`;

  const internal = variant === 'internal' ? internalBanner(checkerName) : '';

  // Shared with the factory report — see REPORT_STYLES.
  const STYLES_PRODUCT = REPORT_STYLES;

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${STYLES_PRODUCT}</style></head><body>
  <div class="pdf-head">
    <div>
      <h1>Product Inspection Report</h1>
      <div class="sub">${esc(productName)}${vendorName ? `  &middot;  ${esc(vendorName)}` : ''}</div>
    </div>
    <div class="gen">Generated: ${esc(fmtDateTime(generatedAt))}</div>
  </div>
  ${body}
  ${sigBlock}
  ${internal}
  <div class="wfoot">M2C — Confidential Inspection Report</div>
  </body></html>`;
}

// ── Shared print / share plumbing ───────────────────────────────────────────
function ensureNativeModules(): boolean {
  if (!Print || !Sharing) {
    Alert.alert(
      'Rebuild Required',
      'PDF generation requires a new dev build.\n\nRun: eas build --platform android --profile development',
    );
    return false;
  }
  return true;
}

async function printAndShare(html: string, filename: string, dialogTitle: string, preview: boolean): Promise<void> {
  if (preview) {
    // Native print/preview dialog — mirrors web's PDFPreviewModal "preview before download".
    await Print.printAsync({ html });
    return;
  }

  const { uri } = await Print.printToFileAsync({ html, base64: false });

  // Rename the generated file so the shared filename matches the web naming
  // (incl. the "(Internal)" suffix). expo-print returns a fixed cache uri.
  let finalUri: string = uri;
  try {
    const { File } = require('expo-file-system/next');
    const source = new File(uri);
    const newUri = `${uri.substring(0, uri.lastIndexOf('/'))}/${filename}`;
    source.move(new File(newUri));
    finalUri = newUri;
  } catch {
    finalUri = uri;
  }

  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(finalUri, {
      mimeType: 'application/pdf',
      dialogTitle,
      UTI: 'com.adobe.pdf',
    });
  } else {
    Alert.alert('PDF Saved', `Report saved to:\n${finalUri}`);
  }
}

// ── Public API ──────────────────────────────────────────────────────────────
export async function downloadFactoryReportPdf(report: any, opts: ReportPdfOptions = {}): Promise<void> {
  if (!ensureNativeModules()) return;
  const variant: ReportVariant = opts.variant || 'canonical';
  const fd = report?.itemsToInspect && !Array.isArray(report.itemsToInspect) ? report.itemsToInspect : {};
  const vendorName = report?.vendor?.companyName || fd.vendorName || 'Report';
  const ref = report?.id ? report.id.slice(-8).toUpperCase() : 'REPORT';
  const suffix = variant === 'internal' ? ' (Internal)' : '';
  const filename = `Factory_Report_${safeFilePart(vendorName)}_${ref}${suffix}.pdf`;
  const html = buildFactoryHtml(report, variant, opts.checkerName);
  await printAndShare(html, filename, `Factory Report — ${vendorName}`, !!opts.preview);
}

export async function downloadProductReportPdf(report: any, opts: ReportPdfOptions = {}): Promise<void> {
  if (!ensureNativeModules()) return;
  const variant: ReportVariant = opts.variant || 'canonical';
  const productName = report?.name || 'Product';
  const idPart = report?.baseSku || report?.id || 'REPORT';
  const suffix = variant === 'internal' ? ' (Internal)' : '';
  const filename = `Product_Report_${safeFilePart(productName)}_${idPart}${suffix}.pdf`;
  const html = buildProductHtml(report, variant, opts.checkerName);
  await printAndShare(html, filename, `Product Report — ${productName}`, !!opts.preview);
}
