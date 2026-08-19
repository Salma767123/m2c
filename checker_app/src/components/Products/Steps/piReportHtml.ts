// Local HTML → PDF builder for the Product Inspection signed report (checker app).
//
// Mirrors the web QC portal's "generate digitally-signed report" behaviour
// (frontend/src/components/Checker/Vendor/Steps/Documentation.tsx via
// productInspectionReportPdf.ts): it composes a report from the in-progress
// formData and, when a client signature is drawn, embeds it. Here we render an
// HTML document and print it to a PDF file with expo-print, returning a base64
// `data:application/pdf;base64,...` data URI so the stored `signedReport` entry
// has the same shape the backend already receives from the web portal.

import * as Print from 'expo-print';
import * as FileSystem from 'expo-file-system/legacy';
import { CODE_LABELS, verificationLabel, isTestOptional } from '../PI_data';
import { formatDuration } from '@/lib/inspectionDuration';
import { buildProductHtml } from '@/lib/reportPdf';

const esc = (s?: unknown): string => {
  if (s === null || s === undefined) return '—';
  const str = String(s).trim();
  if (str === '') return '—';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
};

// YYYY-MM-DD → DD-MM-YYYY for the printed report (matches the form's display).
const fmtDMY = (value?: string | null): string => {
  const m = String(value ?? '').trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : String(value ?? '');
};

// Local clock time for the start/complete stamps, e.g. "14:05".
const fmtTime = (iso?: string | null): string => {
  if (!iso) return '—';
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '—' : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

export interface ReportMeta {
  productName: string;
  vendorName: string;
  inspectorName?: string;
  /**
   * Who ran the inspection. The web report prints the checker's ID, email and
   * phone beneath their name; without this the app could only print a name.
   */
  checker?: { name?: string; checkerId?: string; email?: string; phone?: string } | null;
  location?: { latitude: number; longitude: number } | null;
  generatedAt: Date;
  /** ISO string for when the inspection was opened. */
  inspectionStartedAt?: string | null;
  /** ISO string for when the inspection was completed/submitted. */
  inspectionCompletedAt?: string | null;
  // Duration breakdown (see lib/inspectionDuration.ts). When present, the report
  // prints Active / Paused / Total rows; exceededSchedule highlights the total.
  activeDurationMs?: number;
  pausedDurationMs?: number;
  totalDurationMs?: number;
  scheduledDurationMs?: number;
  exceededSchedule?: boolean;
}

/**
 * The report the Documentation step previews, prints and gets signed.
 *
 * It delegates to the same builder the Reports page uses, so the checker sees
 * one document everywhere — lettered sections A–H, red masthead, red grid
 * tables, signature block and page footer. It used to render its own simpler
 * layout here, which meant the report you signed in the form and the report you
 * downloaded afterwards looked nothing alike.
 *
 * (The preview renders this markup rather than the generated PDF because
 * Android's WebView has no PDF renderer — a data:application/pdf source is
 * blank there. Printing from the same HTML keeps preview and PDF identical.)
 */
export function buildReportHtml(
  formData: any,
  meta: ReportMeta,
  clientSignatureDataUrl?: string | null,
): string {
  // Shape the in-progress form data like the product record buildProductHtml
  // expects. The signature passed in wins over anything already on the form, so
  // the preview shows the stroke the checker just drew.
  const pseudoReport = {
    name: meta.productName,
    vendor: { companyName: meta.vendorName },
    assignedQc: meta.checker || undefined,
    qcAssignment: formData?.productData?.qcAssignment,
    qcInspectionData: {
      ...(formData || {}),
      ...(clientSignatureDataUrl ? { clientSignature: clientSignatureDataUrl } : {}),
      inspectionStartedAt: meta.inspectionStartedAt ?? formData?.inspectionStartedAt,
      inspectionCompletedAt: meta.inspectionCompletedAt ?? formData?.inspectionCompletedAt,
      checkerLocation: meta.location ?? formData?.checkerLocation ?? null,
    },
  };
  return buildProductHtml(pseudoReport, 'canonical', meta.checker?.name || meta.inspectorName);
}

// A photo entry is stored as { name, data } (base64 data URL) or { url }. PDFs are
// skipped — they cannot be shown as an <img>.
const photoSrc = (p: any): string | null => {
  const src = p?.data || p?.url;
  if (!src || p?.isPdf) return null;
  return typeof src === 'string' ? src : null;
};

// Small inline thumbnails, for the pass/fail columns of the test table.
const thumbs = (photos: any[] | undefined): string => {
  const list = (Array.isArray(photos) ? photos : []).map(photoSrc).filter(Boolean) as string[];
  if (list.length === 0) return '—';
  return `<div class="thumbs">${list.map((s) => `<img src="${s}"/>`).join('')}</div>`;
};

// A titled grid of evidence photos. Returns '' when the set is empty so the caller
// can drop the whole section rather than print an empty heading.
const photoBlock = (heading: string, photos: any[] | undefined): string => {
  const list = (Array.isArray(photos) ? photos : []).map(photoSrc).filter(Boolean) as string[];
  if (list.length === 0) return '';
  return `<h2>${esc(heading)}</h2>
    <div class="grid">${list.map((s) => `<img src="${s}"/>`).join('')}</div>`;
};

// camelCase / snake_case evidence key → Title Case ("factoryFrontView" → "Factory Front View").
const humanizeEvidenceKey = (key: string): string =>
  key.replace(/_/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2').replace(/\b\w/g, (c) => c.toUpperCase());

/**
 * SUPERSEDED — the step's own report layout, kept only until the delegated
 * document above has been checked on a real inspection. Nothing calls it; if
 * the A–H document looks right, delete this function and its private helpers.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function buildHtml(formData: any, meta: ReportMeta, clientSignatureDataUrl?: string | null): string {
  const d = formData || {};
  const verEntries = Object.entries(d.productVerifications || {}) as [string, any][];
  const verRows = verEntries
    .map(
      ([key, val]) => `
      <tr>
        <td>${esc(verificationLabel(key))}</td>
        <td>${val.ok === true ? 'Yes' : val.ok === false ? 'No' : '—'}</td>
        <td>${esc(val.remarks)}</td>
      </tr>`,
    )
    .join('');

  const pkgRows = (d.packagingItems || [])
    .map(
      (it: any) => `
      <tr>
        <td>${esc(it.label)}</td>
        <td>${it.verified === true ? 'Yes' : it.verified === false ? 'No' : '—'}</td>
        <td>${it.remarkCode ? `Code ${it.remarkCode} — ${esc(CODE_LABELS[it.remarkCode])}` : '—'}</td>
        <td>${esc(it.remarks)}</td>
      </tr>`,
    )
    .join('');

  const testRows = (d.testGroups || [])
    .flatMap((g: any) =>
      (g.tests || []).map((t: any) => {
        const optional = !t.isOther && isTestOptional(t.id, g.packagingType);
        const result = t.pass ? 'Pass' : t.fail ? 'Fail' : optional ? 'Optional — not tested' : '—';
        return `
      <tr>
        <td>${esc(g.label)}</td>
        <td>${esc(t.label)}${optional ? ' <span class="opt">Optional</span>' : ''}</td>
        <td>${result}</td>
        <td>${esc(t.remarks)}</td>
        <td>${thumbs(t.rightPhotos)}</td>
        <td>${thumbs(t.wrongPhotos)}</td>
      </tr>`;
      }),
    )
    .join('');

  // Evidence sections — the checker's uploaded photos, embedded rather than counted.
  // They are base64 data URLs already, so no fetching is involved.
  const evidenceSections = [
    photoBlock('Product Evidence', d.productEvidencePhotos),
    photoBlock('Packaging Photos', d.packagingPhotos),
    photoBlock('Defect Photos', d.defectPhotos),
    ...Object.entries(d.additionalEvidence || {}).map(([key, list]) =>
      photoBlock(humanizeEvidenceKey(key), list as any[]),
    ),
    photoBlock('Documentation Photos', d.documentationPhotos),
    photoBlock('Photocopy Documents', d.photocopyDocuments),
    photoBlock('Company ID Cards', d.companyIdCards),
  ]
    .filter(Boolean)
    .join('');

  const aqlPass =
    d.criticalDefects <= d.maxAllowedCritical &&
    d.majorDefects <= d.maxAllowedMajor &&
    d.minorDefects <= d.maxAllowedMinor;

  return `<!doctype html><html><head><meta charset="utf-8"/>
  <style>
    /* Brand red, matching the web report and the app's other PDFs. This sheet
       was the only one still on blue headings and grey table headers, so the
       same inspection produced two differently-coloured documents. */
    body{font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#334155;font-size:12px;padding:24px;}
    h1{font-size:20px;margin:0 0 4px;color:#e01a1b;}
    h2{font-size:14px;margin:20px 0 8px;border-bottom:1.2px solid #e01a1b;padding-bottom:4px;color:#e01a1b;}
    .meta{color:#475569;font-size:11px;margin-bottom:4px;}
    table{width:100%;border-collapse:collapse;margin-top:6px;}
    th,td{padding:5px 7px;text-align:left;font-size:11px;vertical-align:top;}
    th{background:#fff5f5;color:#e01a1b;border:0.7px solid #e01a1b;font-weight:700;text-transform:uppercase;font-size:9.5px;}
    td{border:0.5px solid #e2e8f0;color:#334155;}
    tbody tr:nth-child(even) td{background:#f8fafc;}
    .badge{display:inline-block;padding:3px 10px;border-radius:999px;font-weight:700;}
    .pass{background:#dcfce7;color:#166534;}
    .fail{background:#fee2e2;color:#991b1b;}
    .sig{margin-top:8px;border:0.5px solid #e2e8f0;border-radius:8px;padding:8px;width:260px;}
    .sig img{max-width:240px;max-height:110px;}
    /* Evidence photos. page-break-inside keeps a photo whole across page breaks —
       expo-print splits on CSS page boxes, so a grid cell would otherwise be cut. */
    .grid{display:flex;flex-wrap:wrap;gap:6px;margin-top:6px;}
    .grid img{width:104px;height:78px;object-fit:cover;border:0.5px solid #e2e8f0;border-radius:4px;page-break-inside:avoid;}
    .thumbs{display:flex;flex-wrap:wrap;gap:3px;}
    .thumbs img{width:34px;height:26px;object-fit:cover;border:0.5px solid #e2e8f0;border-radius:3px;}
    .opt{display:inline-block;background:#f1f5f9;color:#64748b;font-size:8px;font-weight:700;
         text-transform:uppercase;letter-spacing:.4px;padding:1px 4px;border-radius:3px;margin-left:4px;}
  </style></head><body>
    <h1>Product Inspection Report</h1>
    <div class="meta">Product: <b>${esc(meta.productName)}</b></div>
    <div class="meta">Vendor: <b>${esc(meta.vendorName)}</b></div>
    <div class="meta">Inspector: ${esc(meta.checker?.name || meta.inspectorName)}</div>
    ${meta.checker?.checkerId ? `<div class="meta">Checker ID: ${esc(meta.checker.checkerId)}</div>` : ''}
    ${meta.checker?.email ? `<div class="meta">Inspector Email: ${esc(meta.checker.email)}</div>` : ''}
    ${meta.checker?.phone ? `<div class="meta">Inspector Phone: ${esc(meta.checker.phone)}</div>` : ''}
    <div class="meta">Service Type: ${esc(d.serviceType)}</div>
    <div class="meta">Inspection Date: ${esc(fmtDMY(d.serviceStartDate))}</div>
    <div class="meta">Status: ${esc(d.inspectionStatus)}</div>
    <div class="meta">Inspection Start Time: ${esc(fmtTime(meta.inspectionStartedAt))}</div>
    <div class="meta">Inspection Complete Time: ${esc(fmtTime(meta.inspectionCompletedAt))}</div>
    ${
      meta.totalDurationMs != null && meta.totalDurationMs > 0
        ? `<div class="meta">Active Duration: ${esc(formatDuration(meta.activeDurationMs || 0))}</div>
    <div class="meta">Paused Duration: ${esc(formatDuration(meta.pausedDurationMs || 0))}</div>
    <div class="meta">Total Duration: ${esc(formatDuration(meta.totalDurationMs))}${
      meta.exceededSchedule ? ' (exceeded scheduled duration)' : ''
    }</div>`
        : ''
    }
    ${
      meta.exceededSchedule
        ? `<div class="meta" style="color:#c81e1e;font-weight:700">Exceeded scheduled duration${
            meta.scheduledDurationMs ? ` (scheduled ${esc(formatDuration(meta.scheduledDurationMs))})` : ''
          } &mdash; active work took ${esc(formatDuration(meta.activeDurationMs || 0))}.</div>`
        : ''
    }
    <div class="meta">Generated: ${esc(meta.generatedAt.toLocaleString())}</div>
    ${meta.location ? `<div class="meta">Location: ${meta.location.latitude.toFixed(5)}, ${meta.location.longitude.toFixed(5)}</div>` : ''}

    <h2>Product Verification</h2>
    <table><thead><tr><th>Field</th><th>Verified</th><th>Remarks</th></tr></thead>
    <tbody>${verRows || '<tr><td colspan="3">—</td></tr>'}</tbody></table>

    <h2>Packaging Inspection</h2>
    <table><thead><tr><th>Item</th><th>Inspected</th><th>Remark Code</th><th>Remarks</th></tr></thead>
    <tbody>${pkgRows || '<tr><td colspan="4">—</td></tr>'}</tbody></table>

    <h2>AQL Defects</h2>
    <div class="meta">Inspection Level: ${esc(d.inspectionLevel)} · Sample Size: ${esc(d.sampleSize)}</div>
    <div class="meta">Critical: ${esc(d.criticalDefects)}/${esc(d.maxAllowedCritical)} · Major: ${esc(d.majorDefects)}/${esc(d.maxAllowedMajor)} · Minor: ${esc(d.minorDefects)}/${esc(d.maxAllowedMinor)}</div>
    <div style="margin-top:6px;"><span class="badge ${aqlPass ? 'pass' : 'fail'}">AQL Status: ${aqlPass ? 'PASS' : 'FAIL'}</span></div>

    <h2>Testing</h2>
    <table><thead><tr><th>Group</th><th>Test</th><th>Result</th><th>Remarks</th><th>Pass Photos</th><th>Fail Photos</th></tr></thead>
    <tbody>${testRows || '<tr><td colspan="6">—</td></tr>'}</tbody></table>

    ${evidenceSections}

    ${
      clientSignatureDataUrl
        ? `<h2>Client Signature</h2><div class="sig"><img src="${clientSignatureDataUrl}"/></div>`
        : ''
    }
  </body></html>`;
}

/**
 * Build the report PDF and return a `data:application/pdf;base64,...` data URI.
 * When `clientSignatureDataUrl` is provided it is embedded (digital-sign path).
 */
export async function generateReportPdfDataUri(
  formData: any,
  meta: ReportMeta,
  clientSignatureDataUrl?: string | null,
): Promise<string> {
  // Same markup the preview shows, so the signed PDF and what the checker
  // approved on screen are the same document.
  const html = buildReportHtml(formData, meta, clientSignatureDataUrl);
  const { uri } = await Print.printToFileAsync({ html, base64: false });
  const base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
  FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => {});
  return `data:application/pdf;base64,${base64}`;
}

export function reportFileName(meta: ReportMeta, signed: boolean): string {
  const safe = (meta.productName || 'product').replace(/[^a-z0-9]+/gi, '-').toLowerCase();
  return `inspection-report-${safe}${signed ? '-signed' : ''}.pdf`;
}
