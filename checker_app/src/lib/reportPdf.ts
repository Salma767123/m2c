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

const PRODUCT_REMARK_LABELS: Record<string, string> = {
  shipperCartonRemark: 'Shipper Carton Packaging',
  innerCartonRemark: 'Inner Carton Packaging',
  retailPackagingRemark: 'Retail Packaging',
  productTypeRemark: 'Product Type (style, size, color, material, labeling)',
  aqlWorkmanshipRemark: 'AQL (Workmanship / Appearance / Function)',
  onSiteTestsRemark: 'On-site Tests',
};

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

type VF = Record<string, { ok: boolean | null; remarks?: string }>;

function sectionStatus(vf: VF, prefixes: string[]): string {
  const relevant = Object.entries(vf).filter(([k]) => prefixes.some((p) => k.startsWith(p)));
  if (relevant.length === 0) return '';
  if (relevant.every(([, fv]) => fv.ok === true)) return 'Verified';
  if (relevant.some(([, fv]) => fv.ok === false)) return 'Issues Found';
  return 'Pending';
}

// ── Shared HTML fragments ───────────────────────────────────────────────────
const STYLES = `
  body { font-family: -apple-system, Helvetica, Arial, sans-serif; margin: 0; padding: 24px; color: #1e293b; font-size: 13px; }
  h1 { font-size: 22px; margin: 0 0 4px; }
  .m2c-head { display:flex; align-items:center; margin-bottom:8px; }
  .m2c-logo { width:36px; height:36px; background:#222; border-radius:8px; display:flex; align-items:center; justify-content:center; margin-right:10px; }
  .m2c-logo span { color:#fff; font-weight:900; font-size:14px; letter-spacing:1px; }
  .m2c-name { font-size:11px; font-weight:700; color:#222; margin:0; letter-spacing:0.5px; }
  .m2c-sub { font-size:8px; color:#888; margin:2px 0 0; }
  .head-rule { border:none; border-top:1.5px solid #222; margin:0 0 16px; }
  .banner { background:#222; color:#fff; border-radius:12px; padding:20px; margin-bottom:20px; display:flex; flex-wrap:wrap; }
  .banner-item { width:50%; margin-bottom:12px; }
  .banner-label { font-size:10px; color:#9ca3af; text-transform:uppercase; font-weight:600; margin-bottom:2px; }
  .banner-value { font-size:13px; font-weight:600; }
  .section { border:1px solid #e2e8f0; border-radius:12px; overflow:hidden; margin-bottom:16px; }
  .sh { background:#f8fafc; padding:10px 16px; border-bottom:1px solid #e2e8f0; font-weight:700; font-size:13px; color:#1e293b; display:flex; align-items:center; justify-content:space-between; }
  .sh .status { font-size:10px; font-weight:700; }
  .subhead { font-size:10px; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:0.5px; padding:12px 16px 4px; }
  table { width:100%; border-collapse:collapse; }
  tr { border-bottom:1px solid #f1f5f9; }
  td.k { color:#6b7280; font-size:11px; padding:6px 12px; text-transform:uppercase; font-weight:600; width:40%; }
  td.v { font-size:13px; padding:6px 12px; font-weight:600; }
  .grid-table th { text-align:left; padding:6px 8px; font-size:10px; font-weight:600; color:#fff; background:#222; text-transform:uppercase; }
  .grid-table td { padding:6px 8px; font-size:12px; border-bottom:1px solid #f1f5f9; }
  .result { display:inline-block; padding:4px 12px; border-radius:20px; font-size:12px; font-weight:700; color:#fff; }
  .photos { display:flex; flex-wrap:wrap; gap:8px; padding:12px; }
  .photos img { width:120px; height:120px; object-fit:cover; border-radius:8px; border:1px solid #e2e8f0; }
  .issue { display:flex; gap:8px; padding:10px 16px; border-bottom:1px solid #f1f5f9; }
  .issue-step { font-size:11px; font-weight:700; color:#b91c1c; }
  .issue-remark { font-size:12px; color:#7f1d1d; margin-top:2px; }
  .foot { text-align:center; font-size:9px; color:#bbb; margin-top:30px; padding-top:10px; border-top:1px solid #eee; }
`;

function m2cHeader(): string {
  return `
  <div class="m2c-head">
    <div class="m2c-logo"><span>M2C</span></div>
    <div>
      <p class="m2c-name">M 2 C MarkDowns Private Limited</p>
      <p class="m2c-sub">Quality Control Division</p>
    </div>
  </div>
  <hr class="head-rule" />`;
}

function m2cFooter(): string {
  return `<div class="foot">Confidential — M2C MarkDowns Pvt. Ltd.</div>`;
}

const kvRow = (label: string, value?: unknown) =>
  `<tr><td class="k">${esc(label)}</td><td class="v">${esc(val(value))}</td></tr>`;

function kvSection(title: string, rows: [string, unknown][], status?: string, subheads?: string): string {
  const body = rows.filter(([, v]) => v !== undefined).map(([l, v]) => kvRow(l, v)).join('');
  if (!body && !subheads) return '';
  const statusHtml = status
    ? `<span class="status" style="color:${statusColor(status)}">${status}</span>`
    : '';
  return `<div class="section"><div class="sh"><span>${esc(title)}</span>${statusHtml}</div>${
    subheads || ''
  }<table>${body}</table></div>`;
}

function statusColor(status: string): string {
  return status === 'Verified' ? '#16a34a' : status === 'Issues Found' ? '#dc2626' : '#ca8a04';
}

function photoBlock(photos: any[] | undefined | null, label: string): string {
  if (!Array.isArray(photos) || photos.length === 0) return '';
  const imgs = photos
    .map((p: any, i: number) => {
      const src = typeof p === 'string' ? p : p?.data || p?.url;
      const isImg = src && typeof src === 'string' && (src.startsWith('http') || src.startsWith('data:image'));
      const caption = (typeof p !== 'string' && (p?.label || p?.name)) || `${label} ${i + 1}`;
      return isImg
        ? `<img src="${src}" alt="${esc(caption)}"/>`
        : `<div style="width:120px;height:120px;background:#f1f5f9;border-radius:8px;border:1px dashed #cbd5e1;display:flex;align-items:center;justify-content:center;font-size:10px;color:#94a3b8;text-align:center;padding:4px">${esc(caption)}</div>`;
    })
    .join('');
  return `<div class="subhead">${esc(label)} (${photos.length})</div><div class="photos">${imgs}</div>`;
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
function buildFactoryHtml(report: any, variant: ReportVariant, checkerName?: string): string {
  const fd: Record<string, any> =
    report?.itemsToInspect && !Array.isArray(report.itemsToInspect) ? report.itemsToInspect : {};
  const isNewFormat = fd && typeof fd.verifications === 'object' && fd.verifications !== null;
  const vf: VF = isNewFormat ? (fd.verifications as VF) : {};
  const v: Record<string, any> = report?.vendor || {};
  const reportId: string = report?.id || '';
  const ref = reportId ? reportId.slice(-8).toUpperCase() : '—';
  const vendorName = v.companyName || fd.vendorName || 'Report';
  const resultColor =
    report?.result === 'PASSED' ? '#059669' : report?.result === 'FAILED' ? '#dc2626' : '#6b7280';

  let sections = '';

  if (isNewFormat) {
    // A. Company Information
    const gstDisplay = v.gstNumber
      ? val(v.gstNumber)
      : v.businessType === 'unregistered'
      ? 'Unregistered — no GST number'
      : '—';
    sections += kvSection(
      'A. Company Information',
      [
        ['Company Name', v.companyName],
        ['Business Type', BUSINESS_TYPE[v.businessType] || v.businessType],
        ['GST Number', gstDisplay],
        ['PAN Number', blank(v.panNumber) ? undefined : v.panNumber],
        ['Aadhaar Number', blank(v.aadhaarNumber) ? undefined : v.aadhaarNumber],
        ['Company ID Number', blank(v.companyIdNumber) ? undefined : v.companyIdNumber],
        ['IEC Code', blank(v.iecCode) ? undefined : v.iecCode],
        ['Website', blank(v.website) ? undefined : v.website],
      ],
      sectionStatus(vf, ['c_']),
    );

    // B. Warehouse & Factory Details
    const warehouseRows: [string, unknown][] = [
      ['Ownership Type', OWNERSHIP_TYPE[v.ownershipType] || v.ownershipType],
      ['Warehousing Capacity', v.warehouseSize],
      ['Address Line 1', blank(v.warehouseAddress) ? undefined : v.warehouseAddress],
      ['Address Line 2', blank(v.warehouseAddressLine2) ? undefined : v.warehouseAddressLine2],
      ['Landmark', blank(v.warehouseLandmark) ? undefined : v.warehouseLandmark],
      ['City', blank(v.warehouseCity) ? undefined : v.warehouseCity],
      ['State', blank(v.warehouseState) ? undefined : v.warehouseState],
      ['ZIP / Postal Code', blank(v.warehouseZipCode) ? undefined : v.warehouseZipCode],
      ['Country', blank(v.warehouseCountry) ? undefined : v.warehouseCountry],
    ];
    if (!blank(v.factoryAddress) || !blank(v.factoryCity)) {
      warehouseRows.push(['Factory Address', v.factoryAddress]);
      warehouseRows.push(['Factory City', blank(v.factoryCity) ? undefined : v.factoryCity]);
      warehouseRows.push(['Factory State', blank(v.factoryState) ? undefined : v.factoryState]);
      warehouseRows.push(['Map / Location Link', blank(v.mapLink) ? undefined : v.mapLink]);
    }
    sections += kvSection('B. Warehouse & Factory Details', warehouseRows, sectionStatus(vf, ['w_']));

    // C. Owner Profile
    const ownerName = buildName(v.ownerTitle, v.ownerFirstName, v.ownerMiddleName, v.ownerLastName) || v.ownerName;
    sections += kvSection(
      'C. Owner Profile',
      [
        ['Owner Full Name', ownerName],
        ['Designation', v.designation],
        ['Primary Phone', v.ownerPhone],
        ['Secondary Phone', blank(v.ownerPhone2) ? undefined : v.ownerPhone2],
        ['Primary Email', v.ownerEmail],
        ['Secondary Email', blank(v.ownerEmail2) ? undefined : v.ownerEmail2],
        ['Business Start Date', fmtDate(v.businessStartDate)],
        ['Number of Employees', EMPLOYEE_COUNT[v.employeeCount] || v.employeeCount],
      ],
      sectionStatus(vf, ['o_']),
    );

    // D. Vendor Classification
    sections += kvSection(
      'D. Vendor Classification',
      [
        ['Vendor Types', v.vendorTypes],
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
        certHtml += `<div class="subhead">Quality Certifications</div><table class="grid-table"><tr><th>Certificate Name</th><th>Expiry Date</th><th>Description</th></tr>${certifications
          .map((c: any) => `<tr><td>${esc(val(c.name))}</td><td>${esc(fmtDate(c.expiryDate))}</td><td>${esc(val(c.description))}</td></tr>`)
          .join('')}</table>`;
      }
      const stdRows =
        (!blank(v.complianceStandards) ? kvRow('Compliance Standards', v.complianceStandards) : '') +
        (!blank(v.packagingCapabilities) ? kvRow('Packaging Capabilities', v.packagingCapabilities) : '');
      if (stdRows) certHtml += `<div class="subhead">Standards & Packaging</div><table>${stdRows}</table>`;
      sections += `<div class="section"><div class="sh"><span>G. Certifications & Quality Control</span><span class="status" style="color:${statusColor(
        sectionStatus(vf, ['cert_', 'certDoc_']),
      )}">${sectionStatus(vf, ['cert_', 'certDoc_'])}</span></div>${certHtml}</div>`;
    }

    // H. Contact & Trade Information
    const contactRows: [string, unknown][] = [
      ['Primary Phone', v.businessPhone],
      ['Secondary Phone', blank(v.phoneNumber2) ? undefined : v.phoneNumber2],
      ['Primary Email', v.businessEmail],
      ['Secondary Email', blank(v.businessEmail2) ? undefined : v.businessEmail2],
    ];
    if (v.bankDetails) {
      const b = v.bankDetails;
      contactRows.push(['Bank Name', b.bankName]);
      contactRows.push(['Account Type', blank(b.accountType) ? undefined : b.accountType]);
      contactRows.push(['IFSC Code', blank(b.ifscCode) ? undefined : b.ifscCode]);
    }
    sections += kvSection('H. Contact & Trade Information', contactRows, sectionStatus(vf, ['ct_']));

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
    ]);

    // J. Issues Found
    const issues = allEntries.filter(([, e]) => e.ok === false);
    if (issues.length > 0) {
      const issueHtml = issues
        .map(
          ([k, e]) =>
            `<div class="issue"><div><div class="issue-step">${esc(stepForKey(k))}</div><div class="issue-remark">${
              e.remarks ? esc(e.remarks) : '<i>No remarks provided.</i>'
            }</div></div></div>`,
        )
        .join('');
      sections += `<div class="section"><div class="sh"><span>J. Issues Found</span></div>${issueHtml}</div>`;
    }

    // K. Inspection Details
    sections += kvSection('K. Inspection Details', [
      ['Inspector Name', fd.inspectorName || checkerName || report?.checker?.name],
      ['Inspection Date', fmtDate(fd.inspectionDate)],
      ['Overall Result', fd.inspectionStatus || report?.result],
      ['Inspector Remarks', fd.inspectorRemarks || report?.notes],
      ['Report Generated', new Date().toLocaleString('en-IN')],
    ]);

    // L. Factory Images
    const factoryImgs = Array.isArray(v.documents)
      ? v.documents.filter((d: any) => d.type === 'OTHER' && d.documentUrl).map((d: any) => ({ url: d.documentUrl, name: d.name }))
      : [];
    const evidence = Array.isArray(fd.factoryPhotos) ? fd.factoryPhotos : [];
    if (factoryImgs.length > 0 || evidence.length > 0) {
      sections += `<div class="section"><div class="sh"><span>L. Factory Images</span></div>${photoBlock(
        factoryImgs,
        'Vendor Registration Photos',
      )}${photoBlock(evidence, 'Inspector Evidence Photos')}</div>`;
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

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${STYLES}</style></head><body>
  ${m2cHeader()}
  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
    <div>
      <h1>Factory Inspection Report</h1>
      <p style="font-size:12px;color:#6b7280;margin:0">${esc(vendorName)} &bull; REF: ${ref}</p>
    </div>
    ${report?.result ? `<span class="result" style="background:${resultColor}">${esc(report.result)}</span>` : ''}
  </div>
  <div class="banner">
    <div class="banner-item"><div class="banner-label">Vendor</div><div class="banner-value">${esc(vendorName)}</div></div>
    <div class="banner-item"><div class="banner-label">Client</div><div class="banner-value">${esc(report?.clientName)}</div></div>
    <div class="banner-item"><div class="banner-label">Completed On</div><div class="banner-value">${
      report?.completedAt ? esc(new Date(report.completedAt).toLocaleDateString('en-IN')) : '—'
    }</div></div>
    <div class="banner-item"><div class="banner-label">Priority</div><div class="banner-value">${esc(report?.priority)}</div></div>
  </div>
  ${sections}
  ${selfieHtml}
  ${closing}
  ${m2cFooter()}
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

// ── Product report HTML (web parity) ────────────────────────────────────────
function buildProductHtml(report: any, variant: ReportVariant, checkerName?: string): string {
  const fd: Record<string, any> = (report?.qcInspectionData || {}) as Record<string, any>;
  const items = Array.isArray(fd.items) ? fd.items : [];
  const measurements = Array.isArray(fd.measurements) ? fd.measurements : [];
  const tests = Array.isArray(fd.tests) ? fd.tests : [];
  const status = report?.approvalStatus || 'PENDING';

  const remarkCodes = Object.keys(PRODUCT_REMARK_LABELS)
    .map((k) => Number(fd[k]))
    .filter((n) => !Number.isNaN(n) && n >= 1 && n <= 10);
  const remarkAvg = remarkCodes.length ? remarkCodes.reduce((a, b) => a + b, 0) / remarkCodes.length : 10;
  const overallStatus = remarkAvg >= 8 ? 'PASS' : remarkAvg >= 6 ? 'RE-INSPECTION' : 'REJECTED';

  const remarkColor = (v: any) => {
    const n = Number(v);
    return n >= 8 ? '#059669' : n >= 6 ? '#d97706' : '#dc2626';
  };

  let sections = '';

  // Section 1 — General Information
  sections += kvSection('Section 1 — General Information', [
    ['Client', fd.client],
    ['Vendor', fd.vendor],
    ['Factory', fd.factory],
    ['Service Location', fd.serviceLocation],
    ['Service Start Date', fd.serviceStartDate],
    ['Service Type', fd.serviceType],
  ]);

  // Section 2 — Preparation
  const itemsHtml =
    items.length > 0
      ? items
          .map(
            (it: any) =>
              `<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:10px 14px;margin-bottom:8px"><div style="font-weight:600">${esc(
                it.itemName,
              )}</div>${it.itemDescription ? `<div style="font-size:11px;color:#6b7280;margin-top:2px">${esc(it.itemDescription)}</div>` : ''}<div style="margin-top:6px;font-size:11px;color:#475569">Lot Qty: <strong>${it.totalQuantity ?? '—'}</strong> &nbsp; Inspection Qty: <strong>${it.inspectionQuantity ?? '—'}</strong></div></div>`,
          )
          .join('')
      : '<p style="color:#94a3b8;padding:0 12px">No products recorded.</p>';
  sections += `<div class="section"><div class="sh"><span>Section 2 — Preparation</span></div><div style="padding:12px">${itemsHtml}${photoBlock(
    fd.warehousePhotoEvidences,
    'Warehouse Photos',
  )}</div></div>`;

  // Section 3 — Measurements
  const measHtml =
    measurements.length > 0
      ? `<table class="grid-table"><tr><th>Sample</th><th>Carton L×W×H (cm)</th><th>Product L×W (cm)</th><th>Retail Wt (kg)</th><th>Gross Wt (kg)</th></tr>${measurements
          .map(
            (m: any, i: number) =>
              `<tr><td>${esc(m.sampleName) || `#${i + 1}`}</td><td>${m.cartonLength ?? 0} × ${m.cartonWidth ?? 0} × ${m.cartonHeight ?? 0}</td><td>${m.productLength ?? 0} × ${m.productWidth ?? 0}</td><td>${m.retailWeight ?? 0}</td><td>${m.cartonGrossWeight ?? 0}</td></tr>`,
          )
          .join('')}</table>`
      : '<p style="color:#94a3b8">No measurements recorded.</p>';
  sections += `<div class="section"><div class="sh"><span>Section 3 — Measurements</span></div><div style="padding:12px">${measHtml}${photoBlock(
    fd.measurementPhotos,
    'Measurement Photos',
  )}</div></div>`;

  // Section 4 — Packaging & Remarks
  const pkgHtml = Object.entries(PRODUCT_REMARK_LABELS)
    .map(([k, l]) => {
      const vv = fd[k];
      return `<div style="display:flex;align-items:center;justify-content:space-between;padding:10px 16px;border-bottom:1px solid #f1f5f9"><span style="font-size:13px;color:#334155">${esc(
        l,
      )}</span><span style="font-size:13px;font-weight:700;color:${vv ? remarkColor(vv) : '#94a3b8'}">${vv ? `${vv}/10` : '—'}</span></div>`;
    })
    .join('');
  sections += `<div class="section"><div class="sh"><span>Section 4 — Packaging & Remarks</span></div><div>${pkgHtml}${photoBlock(
    fd.packagingPhotos,
    'Packaging Photos',
  )}</div></div>`;

  // Section 5 — Defects & AQL
  const defectRows = [
    { label: 'Critical', aql: fd.aqlCritical, max: fd.maxAllowedCritical, found: fd.criticalDefects },
    { label: 'Major', aql: fd.aqlMajor, max: fd.maxAllowedMajor, found: fd.majorDefects },
    { label: 'Minor', aql: fd.aqlMinor, max: fd.maxAllowedMinor, found: fd.minorDefects },
  ]
    .map((r) => {
      const exceeded = r.found != null && r.max != null && Number(r.found) > Number(r.max);
      return `<tr><td>${r.label}</td><td>${r.aql ?? '—'}</td><td>${r.max ?? '—'}</td><td>${r.found ?? '—'}</td><td style="font-weight:600;color:${
        r.found != null ? (exceeded ? '#dc2626' : '#059669') : '#94a3b8'
      }">${r.found != null ? (exceeded ? '✗ Exceeded' : '✓ Within Limit') : '—'}</td></tr>`;
    })
    .join('');
  const defectDetails =
    (fd.criticalDefectDetails ? `<div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:10px;margin:8px 0"><p style="font-size:10px;font-weight:700;color:#991b1b;text-transform:uppercase;margin:0 0 4px">Critical Defect Details</p><p style="margin:0;font-size:12px;color:#7f1d1d">${esc(fd.criticalDefectDetails)}</p></div>` : '') +
    (fd.majorDefectDetails ? `<div style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:10px;margin:8px 0"><p style="font-size:10px;font-weight:700;color:#92400e;text-transform:uppercase;margin:0 0 4px">Major Defect Details</p><p style="margin:0;font-size:12px;color:#78350f">${esc(fd.majorDefectDetails)}</p></div>` : '') +
    (fd.minorDefectDetails ? `<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:10px;margin:8px 0"><p style="font-size:10px;font-weight:700;color:#334155;text-transform:uppercase;margin:0 0 4px">Minor Defect Details</p><p style="margin:0;font-size:12px;color:#1e293b">${esc(fd.minorDefectDetails)}</p></div>` : '');
  sections += `<div class="section"><div class="sh"><span>Section 5 — Defects & AQL</span></div><div style="padding:12px"><table>${kvRow(
    'Inspection Level',
    fd.inspectionLevel,
  )}${kvRow('Sample Size', fd.sampleSize)}</table><table class="grid-table" style="margin-top:12px"><tr><th>Type</th><th>AQL Level</th><th>Max Allowed</th><th>Found</th><th>Status</th></tr>${defectRows}</table>${defectDetails}${photoBlock(
    fd.defectPhotos,
    'Defect Photos',
  )}</div></div>`;

  // Section 6 — On-site Testing
  const testsHtml =
    tests.length > 0
      ? tests
          .map(
            (t: any, i: number) =>
              `<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px;margin-bottom:10px"><div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px"><div><strong>${esc(
                t.label || `Test ${i + 1}`,
              )}</strong>${t.detail ? `<div style="font-size:11px;color:#6b7280;margin-top:2px">${esc(t.detail)}</div>` : ''}</div><span style="font-size:11px;font-weight:700;padding:3px 10px;border-radius:20px;color:${
                t.pass ? '#059669' : t.fail ? '#dc2626' : '#6b7280'
              };background:${t.pass ? '#d1fae5' : t.fail ? '#fee2e2' : '#f1f5f9'}">${t.pass ? 'PASS' : t.fail ? 'FAIL' : 'N/A'}</span></div>${photoBlock(
                t.rightPhotos,
                'Right/Correct Photos',
              )}${photoBlock(t.wrongPhotos, 'Wrong/Incorrect Photos')}</div>`,
          )
          .join('')
      : '<p style="color:#94a3b8">No tests recorded.</p>';
  sections += `<div class="section"><div class="sh"><span>Section 6 — On-site Testing</span></div><div style="padding:12px">${testsHtml}${photoBlock(
    fd.testingPhotos,
    'Testing Photos',
  )}</div></div>`;

  // Section 7 — Review & Final Decision
  sections += `<div class="section"><div class="sh"><span>Section 7 — Review & Final Decision</span></div><div style="padding:12px"><div style="display:flex;align-items:center;gap:10px;margin-bottom:12px"><span style="font-size:13px;color:#334155">Final Decision:</span><span style="font-size:13px;font-weight:700;padding:4px 14px;border-radius:20px;color:${
    fd.finalDecision === 'Approved' ? '#059669' : fd.finalDecision === 'Rejected' ? '#dc2626' : '#334155'
  };background:${fd.finalDecision === 'Approved' ? '#d1fae5' : fd.finalDecision === 'Rejected' ? '#fee2e2' : '#f1f5f9'}">${esc(
    fd.finalDecision,
  )}</span></div><div style="border:1px solid #e2e8f0;border-radius:8px;padding:12px;margin-bottom:8px;display:flex;justify-content:space-between"><div><div style="font-size:10px;text-transform:uppercase;color:#64748b">Overall Result</div><div style="font-size:16px;font-weight:700">${overallStatus}</div></div><div style="text-align:right"><div style="font-size:10px;text-transform:uppercase;color:#64748b">Average Score</div><div style="font-size:16px;font-weight:700">${remarkAvg.toFixed(
    1,
  )}/10</div></div></div>${
    fd.reviewerRemarks
      ? `<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:10px"><p style="font-size:10px;font-weight:600;color:#374151;text-transform:uppercase;margin:0 0 4px">Reviewer Remarks</p><p style="margin:0;font-size:13px">${esc(fd.reviewerRemarks)}</p></div>`
      : ''
  }</div></div>`;

  // Section 8 — Documentation & Sign-off
  const signedDocuments = Array.isArray(fd.signedDocuments) ? fd.signedDocuments : [];
  const companyIdCards = Array.isArray(fd.companyIdCards) ? fd.companyIdCards : [];
  const documentationPhotos = Array.isArray(fd.documentationPhotos) ? fd.documentationPhotos : [];
  let docHtml = '';
  if (fd.clientSignature && String(fd.clientSignature).startsWith('http')) {
    docHtml += `<div class="subhead">Client Signature</div><div style="padding:0 16px 12px"><img src="${fd.clientSignature}" style="height:70px;object-fit:contain;border:1px solid #e2e8f0;border-radius:8px;background:#fff;padding:6px" alt="Client signature"/></div>`;
  }
  docHtml += photoBlock(signedDocuments, 'Signed Documents');
  docHtml += photoBlock(companyIdCards, 'Company ID Cards');
  docHtml += photoBlock(documentationPhotos, 'General Documentation Photos');
  if (docHtml.trim()) {
    sections += `<div class="section"><div class="sh"><span>Section 8 — Documentation & Sign-off</span></div>${docHtml}</div>`;
  }

  // Timestamps
  sections += kvSection('Timestamps', [
    ['Product Listed', report?.createdAt ? new Date(report.createdAt).toLocaleString('en-IN') : undefined],
    ['Inspected On', report?.updatedAt ? new Date(report.updatedAt).toLocaleString('en-IN') : undefined],
    ['Approval Status', status],
  ]);

  const selfieHtml = buildSelfieHtml(fd);

  const dateStr = report?.updatedAt
    ? new Date(report.updatedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })
    : new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });

  const closing =
    variant === 'canonical'
      ? signaturePage('Product Inspection Report', dateStr, checkerName || fd.inspectorSignature)
      : internalBanner(checkerName);

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${STYLES}</style></head><body>
  ${m2cHeader()}
  <h1 style="font-size:20px">Product Inspection Report</h1>
  <p style="font-size:12px;color:#6b7280;margin:0 0 16px">${esc(report?.name)} &bull; SKU: ${esc(report?.baseSku || 'N/A')}</p>
  <div class="banner">
    <div class="banner-item"><div class="banner-label">Product</div><div class="banner-value">${esc(report?.name)}</div></div>
    <div class="banner-item"><div class="banner-label">Vendor</div><div class="banner-value">${esc(report?.vendor?.companyName)}</div></div>
    <div class="banner-item"><div class="banner-label">Category</div><div class="banner-value">${esc(report?.category)}</div></div>
    <div class="banner-item"><div class="banner-label">Inspected On</div><div class="banner-value">${
      report?.updatedAt ? esc(new Date(report.updatedAt).toLocaleDateString('en-IN')) : '—'
    }</div></div>
  </div>
  ${
    report?.rejectionReason
      ? `<div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:12px;margin-bottom:16px"><p style="font-size:10px;font-weight:700;color:#991b1b;text-transform:uppercase;margin:0 0 4px">Rejection Reason</p><p style="font-size:13px;color:#7f1d1d;margin:0">${esc(report.rejectionReason)}</p></div>`
      : ''
  }
  ${sections}
  ${selfieHtml}
  ${closing}
  ${m2cFooter()}
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
