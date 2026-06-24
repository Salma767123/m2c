const { prisma } = require('../config/database');

// ─────────────────────────────────────────────────────────────────────────────
// Automatic, immutable, globally-unique product SKU generation.
//
//   Base product SKU : [COMPANY_CODE]-[YY]-[SERIAL]   e.g. MNC-26-000001
//   Variant SKU      : [BASE_SKU]-[ALPHA]             e.g. MNC-26-000001-A
//
// Serials come from a per-(company-code, year) atomic counter document — never
// from count(products) — so deleting a product never causes a reused or
// duplicate serial. The counter only ever increments. Variant suffixes come
// from a per-product counter (Product.variantSeq) for the same reason.
// ─────────────────────────────────────────────────────────────────────────────

const BUSINESS_TIMEZONE = 'Asia/Kolkata';
const SERIAL_PAD = 6;

function getBusinessYearYY() {
  const year = parseInt(
    new Date().toLocaleString('en-US', { timeZone: BUSINESS_TIMEZONE, year: 'numeric' }),
    10
  );
  return String(year).slice(-2);
}

// Company code rules:
//   • multi-word  → first letter of each word
//   • single word → first 3 characters
//   • special characters / spaces stripped, result upper-cased
function deriveCompanyCode(companyName) {
  const words = (companyName || '')
    .split(/\s+/)
    .map((w) => w.replace(/[^A-Za-z0-9]/g, ''))
    .filter(Boolean);

  let code;
  if (words.length === 0) {
    code = 'GEN';
  } else if (words.length === 1) {
    code = words[0].slice(0, 3);
  } else {
    code = words.map((w) => w[0]).join('');
  }
  return code.toUpperCase();
}

// 1 → A, 26 → Z, 27 → AA, 28 → AB … (bijective base-26).
function numberToAlphaSuffix(n) {
  let s = '';
  let x = n;
  while (x > 0) {
    const rem = (x - 1) % 26;
    s = String.fromCharCode(65 + rem) + s;
    x = Math.floor((x - 1) / 26);
  }
  return s || 'A';
}

function formatBaseSku(code, yy, serial) {
  // padStart never truncates — past 999999 the serial naturally grows.
  const digits = String(serial);
  return `${code}-${yy}-${digits.padStart(SERIAL_PAD, '0')}`;
}

function variantSkuFor(baseSku, seq) {
  return `${baseSku}-${numberToAlphaSuffix(seq)}`;
}

// Atomically reserve the next base SKU for a company. Pass a transaction client
// (`tx`) so the counter increment commits/rolls back with the product write.
async function generateBaseSku(client, companyName) {
  const code = deriveCompanyCode(companyName);
  const yy = getBusinessYearYY();
  const counterId = `sku-${code}-${yy}`;
  const counter = await client.counter.upsert({
    where: { id: counterId },
    create: { id: counterId, value: 1 },
    update: { value: { increment: 1 } },
  });
  return formatBaseSku(code, yy, counter.value);
}

// Preview the NEXT base SKU without consuming a sequence number (read-only).
// Used to show vendors the SKU their product/inventory item will get. The value
// is a preview only — the authoritative SKU is reserved atomically on save and
// may differ if another item is created in between.
async function peekNextBaseSku(client, companyName) {
  const code = deriveCompanyCode(companyName);
  const yy = getBusinessYearYY();
  const counter = await client.counter.findUnique({ where: { id: `sku-${code}-${yy}` } });
  const next = (counter?.value || 0) + 1;
  return formatBaseSku(code, yy, next);
}

// Self-heal: if the unique index ever rejects a generated base SKU (counter
// drift after a restore / manual edit), reconcile the counter to the real max
// for that company+year and return a fresh SKU.
async function reconcileBaseSku(client, companyName) {
  const code = deriveCompanyCode(companyName);
  const yy = getBusinessYearYY();
  const prefix = `${code}-${yy}-`;

  const existing = await client.product.findMany({
    where: { baseSku: { startsWith: prefix } },
    select: { baseSku: true },
  });
  const maxSeq = existing.reduce((max, { baseSku }) => {
    const n = parseInt((baseSku || '').slice(prefix.length).split('-')[0], 10);
    return Number.isFinite(n) && n > max ? n : max;
  }, 0);

  const next = maxSeq + 1;
  await client.counter.upsert({
    where: { id: `sku-${code}-${yy}` },
    create: { id: `sku-${code}-${yy}`, value: next },
    update: { value: next },
  });
  return formatBaseSku(code, yy, next);
}

module.exports = {
  deriveCompanyCode,
  getBusinessYearYY,
  numberToAlphaSuffix,
  formatBaseSku,
  variantSkuFor,
  generateBaseSku,
  peekNextBaseSku,
  reconcileBaseSku,
};
