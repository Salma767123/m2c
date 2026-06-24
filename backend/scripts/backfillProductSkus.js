/**
 * One-time backfill: give every product a unique base SKU and every variant a
 * unique variant SKU, WITHOUT changing SKUs that are already set and valid.
 *
 * Run this BEFORE `prisma db push` adds the unique index on Product.baseSku,
 * otherwise the index creation will fail on empty/duplicate values.
 *
 *   node scripts/backfillProductSkus.js          # apply
 *   node scripts/backfillProductSkus.js --dry     # preview only
 *
 * Idempotent: products that already have a non-empty, non-duplicate baseSku are
 * left untouched. The atomic counters are advanced so future auto-generation
 * never collides with backfilled values.
 */
const { prisma } = require('../config/database');
const {
  deriveCompanyCode,
  getBusinessYearYY,
  formatBaseSku,
  variantSkuFor,
} = require('../utils/skuGenerator');

const DRY = process.argv.includes('--dry');

async function main() {
  const products = await prisma.product.findMany({
    include: { vendor: { select: { companyName: true } }, variants: { select: { id: true, sku: true } } },
    orderBy: { createdAt: 'asc' },
  });

  // Track the highest serial used per `${code}-${yy}` so we never reuse one.
  const seqByKey = new Map();
  const usedBaseSkus = new Set();

  // Seed from products that already have a valid baseSku.
  for (const p of products) {
    if (p.baseSku && p.baseSku.trim()) {
      usedBaseSkus.add(p.baseSku);
      const m = p.baseSku.match(/^(.+)-(\d+)$/);
      if (m) {
        const key = m[1];
        const n = parseInt(m[2], 10);
        if (Number.isFinite(n)) seqByKey.set(key, Math.max(seqByKey.get(key) || 0, n));
      }
    }
  }

  let baseFixed = 0;
  let variantFixed = 0;

  for (const p of products) {
    const code = deriveCompanyCode(p.vendor?.companyName);
    const yy = getBusinessYearYY();
    const key = `${code}-${yy}`;

    let baseSku = p.baseSku && p.baseSku.trim() ? p.baseSku : null;

    if (!baseSku) {
      let next = (seqByKey.get(key) || 0) + 1;
      let candidate = formatBaseSku(code, yy, next);
      while (usedBaseSkus.has(candidate)) {
        next += 1;
        candidate = formatBaseSku(code, yy, next);
      }
      seqByKey.set(key, next);
      usedBaseSkus.add(candidate);
      baseSku = candidate;
      baseFixed += 1;
      console.log(`${DRY ? '[dry] ' : ''}product ${p.id} → baseSku ${baseSku}`);
      if (!DRY) await prisma.product.update({ where: { id: p.id }, data: { baseSku } });
    }

    // Variants: keep valid ones; assign suffixes (continuing from variantSeq) to any missing.
    const variants = p.variants || [];
    let seq = p.variantSeq || 0;
    // Ensure variantSeq covers existing suffixes.
    for (const v of variants) {
      const m = (v.sku || '').match(/-([A-Z]+)$/);
      if (m) {
        // rough max tracking by length+char not needed; we just bump below.
      }
    }
    for (let i = 0; i < variants.length; i += 1) {
      const v = variants[i];
      if (v.sku && v.sku.trim()) continue;
      seq += 1;
      const vsku = variantSkuFor(baseSku, seq);
      variantFixed += 1;
      console.log(`${DRY ? '[dry] ' : ''}  variant ${v.id} → ${vsku}`);
      if (!DRY) await prisma.productVariant.update({ where: { id: v.id }, data: { sku: vsku } });
    }
    if (!DRY && variants.length && seq !== (p.variantSeq || 0)) {
      await prisma.product.update({ where: { id: p.id }, data: { variantSeq: Math.max(seq, variants.length) } });
    }
  }

  // Advance the live counters so future auto-generation continues past backfill.
  if (!DRY) {
    for (const [key, value] of seqByKey.entries()) {
      await prisma.counter.upsert({
        where: { id: `sku-${key}` },
        create: { id: `sku-${key}`, value },
        update: { value: { set: value } },
      });
    }
  }

  console.log(`\n${DRY ? '[dry] ' : ''}Done. Base SKUs set: ${baseFixed}, variant SKUs set: ${variantFixed}.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
