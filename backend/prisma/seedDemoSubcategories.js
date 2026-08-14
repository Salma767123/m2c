// Ensure each demo category has 5–6 sub-categories. Idempotent (skips existing by
// slug). Existing sub-categories are kept; missing ones are added.
//   cd backend && node prisma/seedDemoSubcategories.js
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const slugify = (s) => s.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-');

// parentSlug -> ordered list of sub-category names (5–6 each).
const SUBCATS = {
  'bath-terry-towels': ['Checked Terry Towel', 'Border Terry Towel', 'Striped Terry Towel', 'Dobby Terry Towel', 'One Side Terry Towel', 'Jacquard Beach Towel'],
  'kitchen-dining':    ['Dish Cloth', 'Kitchen Towel', 'Table Linen', 'Napkins', 'Aprons', 'Pot Holders'],
  'cotton-bags':       ['Box Type', 'Printed', 'Mesh', 'Tote Bag', 'Drawstring Bag', 'Shopping Bag'],
  'smart-kitchen-sets':['Kitchen Set', 'Apron Set', 'Tea Towel Set', 'Pot Holder Set', 'Oven Glove Set', 'Table Runner Set'],
};

async function main() {
  console.log('▶ Ensuring 5–6 sub-categories per demo category…\n');
  let created = 0, skipped = 0;

  for (const [parentSlug, subs] of Object.entries(SUBCATS)) {
    const parent = await prisma.category.findUnique({ where: { slug: parentSlug }, select: { id: true, name: true } });
    if (!parent) { console.log(`  ✗ parent "${parentSlug}" not found — skip`); continue; }
    console.log(`  ${parent.name}:`);
    let order = 0;
    for (const sub of subs) {
      const slug = `${parentSlug}-${slugify(sub)}`;
      const existing = await prisma.category.findUnique({ where: { slug } });
      if (existing) {
        // Make sure it's correctly parented + active (self-heals earlier rows).
        if (existing.parentId !== parent.id || existing.status !== 'ACTIVE') {
          await prisma.category.update({ where: { id: existing.id }, data: { parentId: parent.id, status: 'ACTIVE', sortOrder: order } });
        }
        console.log(`    • ${sub} (exists)`);
        skipped++; order++; continue;
      }
      await prisma.category.create({
        data: { name: sub, description: `${sub} — part of ${parent.name}.`, slug, parentId: parent.id, status: 'ACTIVE', sortOrder: order },
      });
      console.log(`    ✓ ${sub}`);
      created++; order++;
    }
  }

  console.log(`\n✅ Done — ${created} sub-categories created, ${skipped} already existed.`);
}

main()
  .catch((e) => { console.error('Seed failed:', e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
