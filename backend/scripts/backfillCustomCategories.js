/**
 * One-off backfill: surface legacy vendor custom categories in the taxonomy.
 *
 * Before custom categories were promoted to Category rows, a vendor's "Other"
 * category only ever existed as a free-text string on the product (and in
 * vendor.additionalCategories JSON). Those products are live but their category
 * is unknown to the admin Categories module and to the website navigation.
 *
 * This script finds every distinct product.category that has no matching
 * Category row (case-insensitive) and creates it as PENDING + isCustom, so the
 * admin can approve or merge it from the Categories module. PENDING rows are
 * invisible to the storefront, so running this changes nothing user-facing.
 *
 * Idempotent — re-running creates nothing new.
 *
 * Usage:  node scripts/backfillCustomCategories.js [--dry]
 */
const { prisma } = require('../config/database');
const { slugify, uniqueSlug } = require('../utils/customCategories');

async function main() {
  const dryRun = process.argv.includes('--dry');

  const [products, categories] = await Promise.all([
    prisma.product.findMany({ select: { category: true, subCategory: true, vendorId: true } }),
    prisma.category.findMany({ select: { name: true } }),
  ]);

  const known = new Set(categories.map((c) => c.name.trim().toLowerCase()));

  // Map orphan category name -> a vendor that uses it (for provenance).
  const orphans = new Map();
  for (const p of products) {
    const name = (p.category || '').trim();
    if (!name) continue;
    const key = name.toLowerCase();
    if (known.has(key) || orphans.has(key)) continue;
    orphans.set(key, { name, vendorId: p.vendorId });
  }

  if (orphans.size === 0) {
    console.log('✅ Nothing to backfill — every product category already exists in the taxonomy.');
    return;
  }

  console.log(`Found ${orphans.size} product category(ies) missing from the taxonomy:`);
  for (const { name } of orphans.values()) console.log(`   • ${name}`);

  if (dryRun) {
    console.log('\n(--dry) No changes written.');
    return;
  }

  for (const { name, vendorId } of orphans.values()) {
    const slug = await uniqueSlug(slugify(name));
    await prisma.category.create({
      data: {
        name,
        description: 'Vendor-proposed category — awaiting admin review (backfilled from existing products).',
        slug,
        status: 'PENDING',
        isCustom: true,
        createdByVendorId: vendorId || null,
      },
    });
    console.log(`   ✚ created PENDING "${name}"`);
  }

  console.log(`\n✅ Backfilled ${orphans.size} category(ies) as PENDING — review them in Admin → Categories → "Pending Review".`);
}

main()
  .catch((e) => {
    console.error('Backfill failed:', e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
