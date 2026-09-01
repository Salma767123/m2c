// GST split helpers — CGST/SGST vs IGST determination and per-line splitting.
//
// The place-of-supply rule uses the Admin/Company registered State as the
// SUPPLIER state and the customer's shipping State as the PLACE OF SUPPLY.
// Same state  -> intrastate -> the configured rate splits equally into CGST+SGST.
// Different    -> interstate -> the full configured rate is charged as IGST.
//
// Vendor / warehouse / hub location is never used here.

const { Country, State } = require('country-state-city');

const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

// Resolve a free-form country value ('IN' | 'India' | ...) to an ISO code.
// Defaults to India, since GST only applies on the `.in` region anyway.
function resolveCountryIso(value) {
  if (!value) return 'IN';
  const v = String(value).trim();
  if (!v) return 'IN';
  const upper = v.toUpperCase();
  const byIso = Country.getAllCountries().find((c) => c.isoCode === upper);
  if (byIso) return byIso.isoCode;
  const byName = Country.getAllCountries().find((c) => c.name.toLowerCase() === v.toLowerCase());
  return byName ? byName.isoCode : 'IN';
}

// Resolve a state value (ISO code OR name, e.g. 'TN' or 'Tamil Nadu') to a
// canonical uppercase ISO code within its country, so two differently-typed
// values for the same state compare equal. Returns null when unresolvable.
function resolveStateCode(stateValue, countryValue) {
  if (!stateValue) return null;
  const raw = String(stateValue).trim();
  if (!raw) return null;
  const countryIso = resolveCountryIso(countryValue);
  const states = State.getStatesOfCountry(countryIso) || [];
  const upper = raw.toUpperCase();
  const byCode = states.find((s) => s.isoCode.toUpperCase() === upper);
  if (byCode) return byCode.isoCode.toUpperCase();
  const byName = states.find((s) => s.name.toLowerCase() === raw.toLowerCase());
  if (byName) return byName.isoCode.toUpperCase();
  return null;
}

/**
 * True when supplier and customer are in the SAME state (intrastate).
 * When either state can't be resolved we cannot prove they match, so we treat
 * it as interstate (IGST) — the total tax is identical either way, only the
 * split label differs, and IGST is the safe default for an unknown pairing.
 */
function isIntrastate(supplierState, customerState, supplierCountry, customerCountry) {
  const a = resolveStateCode(supplierState, supplierCountry);
  const b = resolveStateCode(customerState, customerCountry);
  if (!a || !b) return false;
  return a === b;
}

/**
 * Split a single line's already-computed tax into CGST/SGST (intrastate) or
 * IGST (interstate). CGST+SGST always re-sum to the line tax exactly.
 */
function splitLineTax(lineTax, intrastate) {
  const t = round2(lineTax);
  if (t <= 0) return { cgst: 0, sgst: 0, igst: 0 };
  if (intrastate) {
    const cgst = round2(t / 2);
    return { cgst, sgst: round2(t - cgst), igst: 0 };
  }
  return { cgst: 0, sgst: 0, igst: t };
}

// The single GST rate to display, or null when the taxed items mix rates.
function uniformGstRate(items) {
  const distinct = [...new Set((items || [])
    .map((i) => Number(i && i.gstPercentage) || 0)
    .filter((r) => r > 0))];
  return distinct.length === 1 ? distinct[0] : null;
}

// Append a rate to a tax label, e.g. withPct('CGST', 2.5) -> 'CGST (2.5%)'.
function withPct(base, pct) {
  if (pct == null || pct <= 0) return base;
  return `${base} (${parseFloat(Number(pct).toFixed(2))}%)`;
}

// Rate-wise GST breakup: bucket tax by rate, split each bucket into CGST+SGST
// (intrastate), IGST (interstate), or a single GST row (combined).
// lines: [{ net, rate }]. Returns [{ label, amount }].
function gstRateRows(lines, mode) {
  const buckets = new Map();
  for (const l of lines || []) {
    const rate = Number(l && l.rate) || 0;
    if (rate <= 0) continue;
    const lineTax = round2((Number(l.net) || 0) * rate / 100);
    if (lineTax <= 0) continue;
    buckets.set(rate, round2((buckets.get(rate) || 0) + lineTax));
  }
  const rows = [];
  for (const rate of [...buckets.keys()].sort((a, b) => a - b)) {
    const tax = buckets.get(rate);
    if (mode === 'INTERSTATE') {
      rows.push({ label: withPct('IGST', rate), amount: tax });
    } else if (mode === 'INTRASTATE') {
      const c = round2(tax / 2);
      rows.push({ label: withPct('CGST', rate / 2), amount: c });
      rows.push({ label: withPct('SGST', rate / 2), amount: round2(tax - c) });
    } else {
      rows.push({ label: withPct('GST', rate), amount: tax });
    }
  }
  return rows;
}

// Rate-wise rows for a stored order — re-derives per-line post-coupon net as the
// server did, then buckets by rate. Empty for legacy orders whose items lack a
// per-line rate (callers fall back to the order-level split).
function orderGstRateRows(order) {
  const tax = Number(order && order.tax) || 0;
  if (tax <= 0) return [];
  const mode = (order.taxType === 'INTERSTATE' || (Number(order.igstAmount) || 0) > 0) ? 'INTERSTATE' : 'INTRASTATE';
  const subtotal = Number(order.subtotal) || 0;
  const discount = Number(order.discount) || 0;
  const lines = (order.items || []).map((it) => {
    const gross = Number(it.totalPrice) || 0;
    const couponShare = subtotal > 0 ? (gross / subtotal) * discount : 0;
    return { net: Math.max(0, gross - couponShare), rate: Number(it.gstPercentage) || 0 };
  });
  return gstRateRows(lines, mode);
}

module.exports = { resolveCountryIso, resolveStateCode, isIntrastate, splitLineTax, round2, uniformGstRate, withPct, gstRateRows, orderGstRateRows };
