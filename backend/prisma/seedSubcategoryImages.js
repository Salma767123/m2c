// Give every demo sub-category a cover image, pulled from the matching product-type
// folder in "PRODUCT DETAILS 4" and uploaded to Cloudinary. Falls back to the parent
// category's image when no source folder matches. Idempotent: skips a sub-category
// that already has an image.
//   cd backend && node prisma/seedSubcategoryImages.js
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const { uploadToCloudinary } = require('../config/cloudinary');
const prisma = new PrismaClient();

const ROOT = '/Users/salma/Downloads/PRODUCT DETAILS 4';
const IMG_RE = /\.(jpe?g|png|webp)$/i;

// Find the first usable image under a folder (walks into product subfolders).
function findFirstImage(relPath) {
  const abs = path.join(ROOT, relPath);
  if (!fs.existsSync(abs)) return null;
  const entries = fs.readdirSync(abs).sort();
  const img = entries.find((f) => IMG_RE.test(f));
  if (img) return path.join(abs, img);
  for (const e of entries) {
    const sub = path.join(abs, e);
    try { if (fs.statSync(sub).isDirectory()) {
      const inner = fs.readdirSync(sub).sort().find((f) => IMG_RE.test(f));
      if (inner) return path.join(sub, inner);
    } } catch { /* skip */ }
  }
  return null;
}

// sub-category slug -> source path under ROOT (category folder or a specific product
// folder for variety). Missing/unmatched → parent image fallback.
const MAP = {
  // Bath & Terry Towels
  'bath-terry-towels-checked-terry-towel': 'CHECKED TERRY TOWEL',
  'bath-terry-towels-border-terry-towel': 'BORDER TERRY TOWEL',
  'bath-terry-towels-striped-terry-towel': 'STRIPED TERRY TOWEL',
  'bath-terry-towels-dobby-terry-towel': 'DOBBY TERRY TOWEL',
  'bath-terry-towels-one-side-terry-towel': 'ONE SIDE TERRY TOWEL',
  'bath-terry-towels-jacquard-beach-towel': 'JACQUARD BEACH TOWELS',
  // Kitchen & Dining
  'kitchen-dining-dish-cloth': 'DISH CLOTH',
  'kitchen-dining-kitchen-towel': 'NON TERRY WAFFLE TOWEL',
  'kitchen-dining-table-linen': 'Smart Kitchen Set/NN-21-0051',
  'kitchen-dining-napkins': 'NON TERRY PRINTED TOWEL',
  'kitchen-dining-aprons': 'Smart Kitchen Set/NN-21-0047',
  'kitchen-dining-pot-holders': 'Smart Kitchen Set/NN-21-0049',
  // Cotton Bags
  'cotton-bags-box-type': 'BAGS/NN-22-0130',
  'cotton-bags-printed': 'BAGS/NN-22-0131',
  'cotton-bags-mesh': 'BAGS/NN-22-0132',
  'cotton-bags-tote-bag': 'BAGS/NN-22-0133',
  'cotton-bags-drawstring-bag': 'BAGS/NN-22-0131',
  'cotton-bags-shopping-bag': 'BAGS/NN-22-0130',
  // Smart Kitchen Sets
  'smart-kitchen-sets-kitchen-set': 'Smart Kitchen Set/NN-21-0045',
  'smart-kitchen-sets-apron-set': 'Smart Kitchen Set/NN-21-0047',
  'smart-kitchen-sets-tea-towel-set': 'Smart Kitchen Set/NN-21-0048',
  'smart-kitchen-sets-pot-holder-set': 'Smart Kitchen Set/NN-21-0050',
  'smart-kitchen-sets-oven-glove-set': 'Smart Kitchen Set/NN-21-0052',
  'smart-kitchen-sets-table-runner-set': 'Smart Kitchen Set/NN-21-0054',
};

async function main() {
  console.log('▶ Adding cover images to demo sub-categories…\n');
  const subs = await prisma.category.findMany({
    where: { slug: { in: Object.keys(MAP) } },
    select: { id: true, name: true, slug: true, image: true, parentId: true },
  });

  // Parent images for fallback.
  const parents = await prisma.category.findMany({ where: { parentId: null }, select: { id: true, image: true } });
  const parentImg = Object.fromEntries(parents.map((p) => [p.id, p.image]));

  let set = 0, skipped = 0, fallback = 0;
  for (const sub of subs) {
    if (sub.image) { console.log(`  • ${sub.name} — already has image`); skipped++; continue; }
    const src = findFirstImage(MAP[sub.slug] || '');
    let url = null;
    if (src) {
      try {
        const buf = fs.readFileSync(src);
        const res = await uploadToCloudinary(buf, { folder: 'm2c-seed-categories', public_id: sub.slug });
        url = res?.secure_url || null;
      } catch (e) { console.log(`    ! upload failed for ${sub.name}: ${e.message}`); }
    }
    if (!url) { url = parentImg[sub.parentId] || null; if (url) fallback++; }
    if (!url) { console.log(`  ✗ ${sub.name} — no image available`); continue; }
    await prisma.category.update({ where: { id: sub.id }, data: { image: url } });
    console.log(`  ✓ ${sub.name}${src ? '' : ' (parent fallback)'}`);
    set++;
  }

  console.log(`\n✅ Done — ${set} sub-categories imaged (${fallback} via parent fallback), ${skipped} already had images.`);
}

main()
  .catch((e) => { console.error('Seed failed:', e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
