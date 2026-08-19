// Follow-up to seedDemoProducts.js: (1) add each product's sub-category as a child
// Category row under its parent (so the Catalog → Categories tree shows them), and
// (2) create an Inventory record per seeded product and link it (Product.inventoryItemId)
// so the products appear in Catalog → Inventory. Idempotent.
//
// Run:  cd backend && node prisma/seedDemoInventory.js
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const slugify = (s) => s.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-');

async function main() {
  console.log('▶ Seeding sub-categories + inventory for demo products…\n');

  const vendor = await prisma.vendor.findUnique({ where: { email: 'demo.textiles@m2c.dev' } });
  if (!vendor) throw new Error('Demo vendor not found — run seedDemoProducts.js first.');

  const products = await prisma.product.findMany({
    where: { vendorId: vendor.id, baseSku: { startsWith: 'M2C-NN-' } },
    select: { id: true, name: true, baseSku: true, category: true, subCategory: true, description: true, totalStock: true, inventoryItemId: true },
  });
  if (products.length === 0) throw new Error('No demo products found — run seedDemoProducts.js first.');

  // ── 1. Sub-categories (child Category rows under each parent) ───────────────
  const parents = await prisma.category.findMany({
    where: { slug: { in: ['bath-terry-towels', 'kitchen-dining', 'cotton-bags', 'smart-kitchen-sets'] } },
    select: { id: true, name: true },
  });
  const parentByName = Object.fromEntries(parents.map((c) => [c.name, c.id]));

  // Map: parentCategoryName -> Set(subCategory)
  const subMap = {};
  for (const p of products) {
    if (!p.subCategory) continue;
    (subMap[p.category] ||= new Set()).add(p.subCategory);
  }

  let subCreated = 0, subSkipped = 0;
  for (const [catName, subs] of Object.entries(subMap)) {
    const parentId = parentByName[catName];
    if (!parentId) continue;
    let order = 0;
    for (const sub of subs) {
      // Namespaced slug so "Box Type" etc. never collides with a top-level slug.
      const slug = `${slugify(catName)}-${slugify(sub)}`;
      const existing = await prisma.category.findUnique({ where: { slug } });
      if (existing) { subSkipped++; order++; continue; }
      await prisma.category.create({
        data: {
          name: sub,
          description: `${sub} — part of ${catName}.`,
          slug,
          parentId,
          status: 'ACTIVE',
          sortOrder: order++,
        },
      });
      console.log(`  ✓ sub-category "${sub}" under "${catName}"`);
      subCreated++;
    }
  }

  // ── 2. Inventory records (idempotent by sku) + link the product ────────────
  let invCreated = 0, invSkipped = 0;
  for (const p of products) {
    const sku = p.baseSku;
    let inv = await prisma.inventory.findUnique({ where: { sku } });
    if (!inv) {
      inv = await prisma.inventory.create({
        data: {
          vendorId: vendor.id,
          name: p.name,
          sku,
          category: p.category,
          subcategory: p.subCategory || null,
          description: (p.description || '').slice(0, 300),
          currentStock: p.totalStock || 0,
          baseStock: p.totalStock || 0,
          lowStockAlert: 10,
          status: 'ACTIVE',
          supplier: vendor.companyName,
          lastRestocked: new Date(),
          hasProductCreated: true,
          productId: p.id,
        },
      });
      console.log(`  ✓ inventory "${p.name}" (${sku}, stock ${p.totalStock})`);
      invCreated++;
    } else {
      invSkipped++;
    }
    // Link the product to its inventory row so it shows under the inventory item.
    if (p.inventoryItemId !== inv.id) {
      await prisma.product.update({
        where: { id: p.id },
        data: { inventoryItemId: inv.id, isFromInventory: false, trackInventory: true },
      });
    }
  }

  console.log(`\n✅ Done — sub-categories: ${subCreated} created / ${subSkipped} existed; inventory: ${invCreated} created / ${invSkipped} existed; ${products.length} products linked.`);
}

main()
  .catch((e) => { console.error('Seed failed:', e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
