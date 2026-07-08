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
import { CODE_LABELS } from '../PI_data';

const esc = (s?: unknown): string => {
  if (s === null || s === undefined) return '—';
  const str = String(s).trim();
  if (str === '') return '—';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
};

export interface ReportMeta {
  productName: string;
  vendorName: string;
  inspectorName?: string;
  location?: { latitude: number; longitude: number } | null;
  generatedAt: Date;
}

function buildHtml(formData: any, meta: ReportMeta, clientSignatureDataUrl?: string | null): string {
  const d = formData || {};
  const verEntries = Object.entries(d.productVerifications || {}) as [string, any][];
  const verRows = verEntries
    .map(
      ([key, val]) => `
      <tr>
        <td>${esc(key.replace(/^pv_/, '').replace(/_/g, ' '))}</td>
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
      (g.tests || []).map(
        (t: any) => `
      <tr>
        <td>${esc(g.label)}</td>
        <td>${esc(t.label)}</td>
        <td>${t.pass ? 'Pass' : t.fail ? 'Fail' : '—'}</td>
        <td>${esc(t.remarks)}</td>
      </tr>`,
      ),
    )
    .join('');

  const aqlPass =
    d.criticalDefects <= d.maxAllowedCritical &&
    d.majorDefects <= d.maxAllowedMajor &&
    d.minorDefects <= d.maxAllowedMinor;

  return `<!doctype html><html><head><meta charset="utf-8"/>
  <style>
    body{font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#0f172a;font-size:12px;padding:24px;}
    h1{font-size:20px;margin:0 0 4px;}
    h2{font-size:14px;margin:20px 0 8px;border-bottom:2px solid #2563eb;padding-bottom:4px;color:#1e40af;}
    .meta{color:#475569;font-size:11px;margin-bottom:4px;}
    table{width:100%;border-collapse:collapse;margin-top:6px;}
    th,td{border:1px solid #cbd5e1;padding:5px 7px;text-align:left;font-size:11px;vertical-align:top;}
    th{background:#f1f5f9;}
    .badge{display:inline-block;padding:3px 10px;border-radius:999px;font-weight:700;}
    .pass{background:#dcfce7;color:#166534;}
    .fail{background:#fee2e2;color:#991b1b;}
    .sig{margin-top:8px;border:1px solid #cbd5e1;border-radius:8px;padding:8px;width:260px;}
    .sig img{max-width:240px;max-height:110px;}
  </style></head><body>
    <h1>Product Inspection Report</h1>
    <div class="meta">Product: <b>${esc(meta.productName)}</b></div>
    <div class="meta">Vendor: <b>${esc(meta.vendorName)}</b></div>
    <div class="meta">Inspector: ${esc(meta.inspectorName)}</div>
    <div class="meta">Service Type: ${esc(d.serviceType)}</div>
    <div class="meta">Inspection Date: ${esc(d.serviceStartDate)}</div>
    <div class="meta">Status: ${esc(d.inspectionStatus)}</div>
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
    <table><thead><tr><th>Group</th><th>Test</th><th>Result</th><th>Remarks</th></tr></thead>
    <tbody>${testRows || '<tr><td colspan="4">—</td></tr>'}</tbody></table>

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
  const html = buildHtml(formData, meta, clientSignatureDataUrl);
  const { uri } = await Print.printToFileAsync({ html, base64: false });
  const base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
  FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => {});
  return `data:application/pdf;base64,${base64}`;
}

export function reportFileName(meta: ReportMeta, signed: boolean): string {
  const safe = (meta.productName || 'product').replace(/[^a-z0-9]+/gi, '-').toLowerCase();
  return `inspection-report-${safe}${signed ? '-signed' : ''}.pdf`;
}
