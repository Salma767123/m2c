// GST split helper (client mirror of backend utils/gst.js).
//
// Place-of-supply rule: SUPPLIER = Admin/Company registered State,
// PLACE OF SUPPLY = customer's shipping/billing State.
//   Same state      -> intrastate -> CGST + SGST (rate split equally)
//   Different state  -> interstate -> IGST (full rate)
// Vendor / warehouse / hub location is never used.

import { getStateName } from '@/components/WebSite/CheckOut/CheckoutProcess/constants';

export type GstType = 'INTRASTATE' | 'INTERSTATE' | null;

export interface GstBreakup {
  cgst: number;
  sgst: number;
  igst: number;
  type: GstType;
}

const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

/**
 * True when supplier and customer resolve to the SAME state. State values may be
 * ISO codes ('TN') or names ('Tamil Nadu'); both are normalised to the canonical
 * name before comparing. When either is missing/unresolvable we can't prove a
 * match, so it's treated as interstate (IGST) — the total is identical either
 * way, only the split label differs.
 */
export function isIntrastate(
  supplierState?: string | null,
  customerState?: string | null,
  supplierCountry?: string | null,
  customerCountry?: string | null,
): boolean {
  if (!supplierState || !customerState) return false;
  const a = getStateName(String(supplierState), supplierCountry ?? 'IN').trim().toLowerCase();
  const b = getStateName(String(customerState), customerCountry ?? 'IN').trim().toLowerCase();
  if (!a || !b) return false;
  return a === b;
}

/** The single GST rate to display, or null when the taxed items mix rates. */
export function uniformGstRate(rates: Array<number | null | undefined>): number | null {
  const distinct = Array.from(new Set(rates.filter((r): r is number => !!r && r > 0)));
  return distinct.length === 1 ? distinct[0] : null;
}

/** Append a rate to a tax label, e.g. withPct('CGST', 2.5) -> 'CGST (2.5%)'. */
export function withPct(base: string, pct?: number | null): string {
  if (pct == null || pct <= 0) return base;
  return `${base} (${parseFloat(pct.toFixed(2))}%)`;
}

/**
 * Turn a stored order's tax fields into display rows for order pages / receipts:
 * IGST (interstate), CGST + SGST (intrastate), or a single legacy "Tax (GST)"
 * row for orders that predate the split. Empty when there's no tax. `ratePct` is
 * the total GST rate (shown when all taxed items share one rate) — CGST/SGST get
 * half of it, IGST/Tax the full rate.
 */
export function orderGstLines(o: {
  tax?: number;
  cgstAmount?: number;
  sgstAmount?: number;
  igstAmount?: number;
  taxType?: GstType;
}, ratePct?: number | null): Array<{ label: string; amount: number }> {
  const tax = o.tax || 0;
  if (tax <= 0) return [];
  const half = ratePct != null ? ratePct / 2 : null;
  if (o.taxType === 'INTERSTATE' || (o.igstAmount ?? 0) > 0) {
    return [{ label: withPct('IGST', ratePct), amount: o.igstAmount ?? tax }];
  }
  if (o.taxType === 'INTRASTATE' || (o.cgstAmount ?? 0) > 0 || (o.sgstAmount ?? 0) > 0) {
    return [
      { label: withPct('CGST', half), amount: o.cgstAmount ?? r2(tax / 2) },
      { label: withPct('SGST', half), amount: o.sgstAmount ?? r2(tax / 2) },
    ];
  }
  return [{ label: withPct('Tax (GST)', ratePct), amount: tax }];
}

// One taxable line: its post-discount net value and its GST rate (percent).
export interface GstLine { net: number; rate: number }

export type GstMode = 'INTRASTATE' | 'INTERSTATE' | 'COMBINED';

/**
 * GST-compliant rate-wise breakup: bucket the tax by distinct rate, then split
 * each bucket into CGST+SGST (intrastate), IGST (interstate), or a single GST
 * row (combined — when the place-of-supply split isn't known yet). A single-rate
 * cart naturally collapses to one pair/row.
 */
export function gstRateRows(lines: GstLine[], mode: GstMode): Array<{ label: string; amount: number }> {
  const buckets = new Map<number, number>();
  for (const l of lines) {
    const rate = Number(l.rate) || 0;
    if (rate <= 0) continue;
    const lineTax = r2((Number(l.net) || 0) * rate / 100);
    if (lineTax <= 0) continue;
    buckets.set(rate, r2((buckets.get(rate) || 0) + lineTax));
  }
  const rows: Array<{ label: string; amount: number }> = [];
  for (const rate of [...buckets.keys()].sort((a, b) => a - b)) {
    const tax = buckets.get(rate) as number;
    if (mode === 'INTERSTATE') {
      rows.push({ label: withPct('IGST', rate), amount: tax });
    } else if (mode === 'INTRASTATE') {
      const cgst = r2(tax / 2);
      rows.push({ label: withPct('CGST', rate / 2), amount: cgst });
      rows.push({ label: withPct('SGST', rate / 2), amount: r2(tax - cgst) });
    } else {
      rows.push({ label: withPct('GST', rate), amount: tax });
    }
  }
  return rows;
}

/**
 * Rate-wise GST rows for a stored order (order pages / receipts). Re-derives the
 * per-line post-coupon net exactly as the server did, then buckets by rate.
 * Falls back to the order-level split for legacy orders whose items carry no
 * per-line rate.
 */
export function orderGstRows(o: {
  tax?: number;
  subtotal?: number;
  discount?: number;
  cgstAmount?: number;
  sgstAmount?: number;
  igstAmount?: number;
  taxType?: GstType;
  items?: Array<{ totalPrice?: number; gstPercentage?: number | null }>;
}): Array<{ label: string; amount: number }> {
  const tax = o.tax || 0;
  if (tax <= 0) return [];
  const mode: GstMode = (o.taxType === 'INTERSTATE' || (o.igstAmount ?? 0) > 0) ? 'INTERSTATE' : 'INTRASTATE';
  const subtotal = o.subtotal || 0;
  const discount = o.discount || 0;
  const lines: GstLine[] = (o.items || []).map((it) => {
    const gross = Number(it.totalPrice) || 0;
    const couponShare = subtotal > 0 ? (gross / subtotal) * discount : 0;
    return { net: Math.max(0, gross - couponShare), rate: Number(it.gstPercentage) || 0 };
  });
  const rows = gstRateRows(lines, mode);
  // Legacy orders (no per-line rate) — fall back to the stored order-level split.
  return rows.length ? rows : orderGstLines(o, uniformGstRate((o.items || []).map((i) => i.gstPercentage)));
}

/** Split a total tax amount into CGST/SGST (intrastate) or IGST (interstate). */
export function splitGst(taxAmount: number, intrastate: boolean): GstBreakup {
  const t = r2(taxAmount || 0);
  if (t <= 0) return { cgst: 0, sgst: 0, igst: 0, type: null };
  if (intrastate) {
    const cgst = r2(t / 2);
    return { cgst, sgst: r2(t - cgst), igst: 0, type: 'INTRASTATE' };
  }
  return { cgst: 0, sgst: 0, igst: t, type: 'INTERSTATE' };
}

/**
 * Display rows for a freshly-computed breakup (Cart / Checkout live totals).
 * `ratePct` (the total GST rate, when uniform) is shown on each label: CGST/SGST
 * get half, IGST the full rate.
 */
export function gstLinesFromBreakup(b: GstBreakup, ratePct?: number | null): Array<{ label: string; amount: number }> {
  const half = ratePct != null ? ratePct / 2 : null;
  if (b.type === 'INTERSTATE') return [{ label: withPct('IGST', ratePct), amount: b.igst }];
  if (b.type === 'INTRASTATE') {
    return [{ label: withPct('CGST', half), amount: b.cgst }, { label: withPct('SGST', half), amount: b.sgst }];
  }
  return [];
}
