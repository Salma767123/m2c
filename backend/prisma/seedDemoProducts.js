// One-off seed: 4 categories + 11 products built from the "PRODUCT DETAILS 4"
// folder (real M2C product images + Details.docx specs). Products are attached to
// a dedicated demo manufacturer vendor, published (ACTIVE + APPROVED) so they show
// on the storefront, and tagged Featured / Top Selling / Best Seller for the home
// sections. Idempotent: re-running skips categories (by slug) and products (by baseSku).
//
// Run:  cd backend && node prisma/seedDemoProducts.js
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { PrismaClient } = require('@prisma/client');
const { uploadToCloudinary } = require('../config/cloudinary');

const prisma = new PrismaClient();

const ROOT = '/Users/salma/Downloads/PRODUCT DETAILS 4';
const IMG_RE = /\.(jpe?g|png|webp)$/i;
const USD = (inr) => Math.round((inr / 83) * 100) / 100;
const slugify = (s) => s.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-');

// Pull the plain text out of a Details.docx (docx = zip; text lives in document.xml).
function docxText(docxPath) {
  try {
    const xml = execFileSync('unzip', ['-p', docxPath, 'word/document.xml'], { maxBuffer: 10 * 1024 * 1024 }).toString();
    return xml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  } catch { return ''; }
}

// ── Categories ────────────────────────────────────────────────────────────────
const CATEGORIES = [
  { name: 'Bath & Terry Towels', description: 'Premium 100% cotton terry towels — soft, highly absorbent and built for everyday use.' },
  { name: 'Kitchen & Dining',    description: 'Cotton dish cloths and kitchen linen — durable, quick-drying and AZO-free dyed.' },
  { name: 'Cotton Bags',         description: 'Reusable, eco-friendly 100% cotton bags — a sustainable alternative to plastic.' },
  { name: 'Smart Kitchen Sets',  description: 'Complete cotton kitchen sets — apron, oven glove, potholders, tea towels and more.' },
];

// ── Products ────────────────────────────────────────────────────────────────
// folder = subfolder under ROOT/<catFolder>; images + Details.docx read from there.
const PRODUCTS = [
  // Bath & Terry Towels
  { ref: 'NN-21-0015', catFolder: 'CHECKED TERRY TOWEL', category: 'Bath & Terry Towels', subCategory: 'Checked Terry Towel',
    name: 'Plain Mono Checked Terry Towel', price: 249, mrp: 349, gsm: '330', size: '40 x 65 cm', weight: '85', fabricType: 'Terry Cotton', tags: ['Featured', 'Best Seller'] },
  { ref: 'NN-21-0016', catFolder: 'CHECKED TERRY TOWEL', category: 'Bath & Terry Towels', subCategory: 'Checked Terry Towel',
    name: 'Square Checked Terry Towel', price: 279, mrp: 379, gsm: '330', size: '40 x 65 cm', weight: '90', fabricType: 'Terry Cotton', tags: ['Top Selling'] },
  { ref: 'NN-21-0021', catFolder: 'CHECKED TERRY TOWEL', category: 'Bath & Terry Towels', subCategory: 'Checked Terry Towel',
    name: 'Multi Mono Checked Terry Towel', price: 299, mrp: 399, gsm: '340', size: '40 x 65 cm', weight: '95', fabricType: 'Terry Cotton', tags: ['Featured'] },

  // Kitchen & Dining (Dish Cloths)
  { ref: 'NN-21-0011', catFolder: 'DISH CLOTH', category: 'Kitchen & Dining', subCategory: 'Dish Cloth',
    name: 'Striped Dish Cloth', price: 99, mrp: 149, gsm: '300', size: '35 x 50 cm', weight: '55', fabricType: 'Terry Cotton', tags: ['Best Seller'] },
  { ref: 'NN-21-0012', catFolder: 'DISH CLOTH', category: 'Kitchen & Dining', subCategory: 'Dish Cloth',
    name: 'Diamond Border Dish Cloth', price: 89, mrp: 129, gsm: '300', size: '35 x 50 cm', weight: '52', fabricType: 'Terry Cotton', tags: ['Top Selling'] },
  { ref: 'NN-21-0013', catFolder: 'DISH CLOTH', category: 'Kitchen & Dining', subCategory: 'Dish Cloth',
    name: 'Rib Dish Cloth', price: 109, mrp: 159, gsm: '310', size: '35 x 50 cm', weight: '58', fabricType: 'Rib Cotton', tags: [] },

  // Cotton Bags
  { ref: 'NN-22-0130', catFolder: 'BAGS', category: 'Cotton Bags', subCategory: 'Box Type',
    name: 'Box Type Cotton Bag', price: 249, mrp: 349, gsm: '180', size: '38 x 42 x 12 cm', weight: '120', fabricType: 'Woven Cotton', tags: ['Featured'] },
  { ref: 'NN-22-0131', catFolder: 'BAGS', category: 'Cotton Bags', subCategory: 'Printed',
    name: 'Printed Cotton Bag', price: 279, mrp: 379, gsm: '180', size: '38 x 42 cm', weight: '110', fabricType: 'Woven Cotton', tags: ['Top Selling', 'Best Seller'] },
  { ref: 'NN-22-0132', catFolder: 'BAGS', category: 'Cotton Bags', subCategory: 'Mesh',
    name: 'Mesh Cotton Bag', price: 229, mrp: 299, gsm: '160', size: '38 x 42 cm', weight: '95', fabricType: 'Mesh Cotton', tags: [] },

  // Smart Kitchen Sets
  { ref: 'NN-21-0045', catFolder: 'Smart Kitchen Set', category: 'Smart Kitchen Sets', subCategory: 'Kitchen Set',
    name: 'Smart Kitchen Set — Essential', price: 1099, mrp: 1499, gsm: '320', size: 'Set of 8', weight: '850', fabricType: 'Woven Cotton', tags: ['Featured', 'Best Seller'] },
  { ref: 'NN-21-0046', catFolder: 'Smart Kitchen Set', category: 'Smart Kitchen Sets', subCategory: 'Kitchen Set',
    name: 'Smart Kitchen Set — Classic', price: 1199, mrp: 1599, gsm: '320', size: 'Set of 8', weight: '880', fabricType: 'Woven Cotton', tags: ['Top Selling'] },
];

function buildDescription(p, docText) {
  // Pull the "features" prose out of the doc when present; otherwise use a default.
  const intro = docText && docText.length > 40
    ? docText.replace(/REF NO:.*$/i, '').replace(/TOWEL SPECIFICATION.*$/i, '').trim().slice(0, 600)
    : `${p.name} — crafted from 100% cotton with auto-loom weaving and AZO-free dyes.`;
  return [
    intro,
    '',
    'Made from 100% cotton ring-spun yarn on auto-loom quality machines, dyed with 100% AZO-free dyes (40°–60° colour fastness) and strongly four-side hemmed for long life. Highly absorbent, soft and comfortable for everyday use.',
  ].join('\n');
}

async function main() {
  console.log('▶ Seeding demo categories + products…\n');

  if (!fs.existsSync(ROOT)) throw new Error(`Source folder not found: ${ROOT}`);

  // 1. Demo manufacturer vendor (reused across runs).
  let vendor = await prisma.vendor.findUnique({ where: { email: 'demo.textiles@m2c.dev' } });
  if (!vendor) {
    vendor = await prisma.vendor.create({
      data: {
        email: 'demo.textiles@m2c.dev',
        ownerName: 'Naveen Kumar', ownerEmail: 'demo.textiles@m2c.dev', ownerPhone: '+91 98400 00000',
        companyName: 'M2C Home Textiles', companyType: 'MANUFACTURER', vendorType: 'TEXTILE_MANUFACTURER',
        businessPhone: '+91 98400 00000', businessEmail: 'demo.textiles@m2c.dev',
        businessAddress: 'SIDCO Industrial Estate', businessCity: 'Karur', businessState: 'Tamil Nadu',
        businessZipCode: '639002', businessCountry: 'India',
        companyDescription: 'Manufacturer of premium 100% cotton home textiles — towels, kitchen linen and bags.',
        status: 'APPROVED', approvedAt: new Date(),
      },
    });
    console.log(`  ✓ created demo vendor "${vendor.companyName}"`);
  } else {
    console.log(`  • reusing vendor "${vendor.companyName}"`);
  }

  // 2. Categories (idempotent by slug).
  const catId = {};
  const catFirstImage = {};
  for (let i = 0; i < CATEGORIES.length; i++) {
    const c = CATEGORIES[i];
    const slug = slugify(c.name);
    let cat = await prisma.category.findUnique({ where: { slug } });
    if (!cat) {
      cat = await prisma.category.create({
        // parentId MUST be an explicit null (not omitted): the admin category list
        // filters `where: { parentId: null }`, which in MongoDB does NOT match a
        // missing field — an omitted parentId hides the category from the module.
        data: { name: c.name, description: c.description, slug, status: 'ACTIVE', sortOrder: i, parentId: null },
      });
      console.log(`  ✓ category "${c.name}"`);
    } else {
      console.log(`  • category "${c.name}" exists`);
    }
    catId[c.name] = cat.id;
  }

  // 3. Products.
  let created = 0, skipped = 0;
  for (const p of PRODUCTS) {
    const baseSku = `M2C-${p.ref}`;
    const existing = await prisma.product.findUnique({ where: { baseSku } });
    if (existing) { console.log(`  • product ${baseSku} (${p.name}) exists — skip`); skipped++; continue; }

    const dir = path.join(ROOT, p.catFolder, p.ref);
    if (!fs.existsSync(dir)) { console.log(`  ✗ missing folder ${dir} — skip`); continue; }

    const imgFiles = fs.readdirSync(dir).filter((f) => IMG_RE.test(f)).sort();
    const docx = fs.readdirSync(dir).find((f) => /\.docx$/i.test(f));
    const docText = docx ? docxText(path.join(dir, docx)) : '';

    // Upload images to Cloudinary.
    const uploaded = [];
    for (const f of imgFiles) {
      try {
        const buf = fs.readFileSync(path.join(dir, f));
        const res = await uploadToCloudinary(buf, { folder: 'm2c-seed-products', public_id: `${p.ref}-${path.parse(f).name}`.replace(/[^\w-]/g, '_') });
        if (res?.secure_url) uploaded.push(res.secure_url);
      } catch (e) { console.log(`    ! image upload failed (${f}): ${e.message}`); }
    }
    if (uploaded.length === 0) { console.log(`  ✗ no images uploaded for ${p.ref} — skip`); continue; }

    const discount = Math.round(((p.mrp - p.price) / p.mrp) * 100);
    const product = await prisma.product.create({
      data: {
        vendorId: vendor.id,
        name: p.name,
        slug: `${slugify(p.name)}-${p.ref.toLowerCase()}`,
        description: buildDescription(p, docText),
        category: p.category,
        subCategory: p.subCategory || null,
        baseSku,
        basePrice: p.price,
        adminFixedPrice: p.price,
        priceINR: p.price,
        priceUSD: USD(p.price),
        originalPrice: p.mrp,
        originalPriceINR: p.mrp,
        originalPriceUSD: USD(p.mrp),
        discount,
        gstPercentage: 5,
        priceVisibility: 'BOTH',
        material: '100% Cotton',
        fabricType: p.fabricType,
        fabricSpecifications: {
          Yarn: '100% Cotton Ring Spun',
          Weave: 'Auto Loom Quality',
          Dyeing: '100% AZO-Free Dyes (40°–60° colour fastness)',
          GSM: p.gsm,
          Hemming: 'Four-side strongly stitched',
        },
        singleUnitSize: p.size,
        singleUnitColor: 'Assorted',
        dimensions: p.size,
        weight: p.weight,
        weightUnit: 'g',
        totalStock: 60 + Math.floor(((p.price * 7) % 80)),
        inStock: true,
        uom: 'pcs',
        tags: p.tags,
        dispatchTimeline: { processingDays: 1, shippingDays: 3, totalDays: 4 },
        status: 'ACTIVE',
        approvalStatus: 'APPROVED',
        approvedAt: new Date(),
      },
    });

    await prisma.productImage.createMany({
      data: uploaded.map((url, idx) => ({
        productId: product.id,
        url,
        alt: p.name,
        isPrimary: idx === 0,
        imageType: idx === 0 ? 'cover' : 'gallery',
        sortOrder: idx,
      })),
    });

    if (!catFirstImage[p.category]) catFirstImage[p.category] = uploaded[0];
    console.log(`  ✓ product ${baseSku} "${p.name}" (${uploaded.length} imgs) [${p.tags.join(', ') || 'no tags'}]`);
    created++;
  }

  // 4. Give each category a cover image from its first product (if not already set).
  for (const [name, url] of Object.entries(catFirstImage)) {
    await prisma.category.update({ where: { id: catId[name] }, data: { image: url } }).catch(() => {});
  }

  console.log(`\n✅ Done — ${created} products created, ${skipped} skipped, ${CATEGORIES.length} categories ensured.`);
}

main()
  .catch((e) => { console.error('Seed failed:', e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
