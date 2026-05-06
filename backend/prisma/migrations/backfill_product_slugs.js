/**
 * One-time migration: Backfill slugs for existing products.
 * Run: node prisma/migrations/backfill_product_slugs.js
 */
const { prisma } = require('../../config/database');

const generateSlug = (name) => {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9 -]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
};

async function backfillSlugs() {
  const products = await prisma.product.findMany({
    where: { slug: null },
    select: { id: true, name: true }
  });

  console.log(`Found ${products.length} products without slugs.`);

  const usedSlugs = new Set();

  // Pre-load existing slugs
  const existing = await prisma.product.findMany({
    where: { slug: { not: null } },
    select: { slug: true }
  });
  existing.forEach(p => usedSlugs.add(p.slug));

  let updated = 0;
  for (const product of products) {
    let slug = generateSlug(product.name);
    let candidate = slug;
    let suffix = 0;

    while (usedSlugs.has(candidate)) {
      suffix++;
      candidate = `${slug}-${suffix}`;
    }

    usedSlugs.add(candidate);

    await prisma.product.update({
      where: { id: product.id },
      data: { slug: candidate }
    });

    updated++;
    console.log(`[${updated}/${products.length}] ${product.name} → ${candidate}`);
  }

  console.log(`\nDone! Updated ${updated} products with slugs.`);
  process.exit(0);
}

backfillSlugs().catch((err) => {
  console.error('Backfill failed:', err);
  process.exit(1);
});
