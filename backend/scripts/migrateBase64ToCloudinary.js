/**
 * Scans the database for base64 data URIs, uploads each to Cloudinary, and
 * replaces the stored value with the resulting secure URL.
 *
 * Run:
 *   node backend/scripts/migrateBase64ToCloudinary.js           # dry run
 *   node backend/scripts/migrateBase64ToCloudinary.js --apply   # perform writes
 *
 * Requires CLOUDINARY_CLOUD_NAME / CLOUDINARY_API_KEY / CLOUDINARY_API_SECRET
 * in backend/.env.
 */

const { PrismaClient } = require('@prisma/client');
require('dotenv').config();
const { uploadDataUriIfBase64, resolveBase64InValue } = require('../config/cloudinary');

const prisma = new PrismaClient();
const APPLY = process.argv.includes('--apply');

const isBase64 = (v) => typeof v === 'string' && v.startsWith('data:');

const summary = {
  productImage: { scanned: 0, converted: 0, failed: 0 },
  productVariant: { scanned: 0, convertedEntries: 0, failed: 0 },
  productQcInspectionData: { scanned: 0, converted: 0, failed: 0 },
  inspectionItemsToInspect: { scanned: 0, converted: 0, failed: 0 },
  companyInfoLogo: { scanned: 0, converted: 0, failed: 0 },
  categoryImage: { scanned: 0, converted: 0, failed: 0 },
  bannerImage: { scanned: 0, converted: 0, failed: 0 },
  vendorOwnerPhoto: { scanned: 0, converted: 0, failed: 0 },
  vendorCompanyLogo: { scanned: 0, converted: 0, failed: 0 },
  vendorDocument: { scanned: 0, converted: 0, failed: 0 },
  vendorCertification: { scanned: 0, converted: 0, failed: 0 },
};

async function migrate(folder, table, fieldName, findArgs, updateFn) {
  const rows = await prisma[table].findMany(findArgs);
  for (const row of rows) {
    summary[fieldName].scanned++;
    try {
      const url = await uploadDataUriIfBase64(row[updateFn.field], { folder });
      if (url !== row[updateFn.field]) {
        if (APPLY) await updateFn.update(row.id, url);
        summary[fieldName].converted++;
        console.log(
          `  ${table}.${updateFn.field} id=${row.id} → ${APPLY ? 'uploaded' : 'would upload'}`,
        );
      }
    } catch (e) {
      summary[fieldName].failed++;
      console.error(`  [fail] ${table} id=${row.id}:`, e.message);
    }
  }
}

async function migrateVariantArrays() {
  const rows = await prisma.productVariant.findMany({
    select: { id: true, images: true },
  });
  for (const row of rows) {
    summary.productVariant.scanned++;
    if (!Array.isArray(row.images)) continue;
    const nextImages = [];
    let changed = false;
    for (const u of row.images) {
      if (isBase64(u)) {
        try {
          const url = await uploadDataUriIfBase64(u, { folder: 'products/variants' });
          nextImages.push(url);
          changed = true;
          summary.productVariant.convertedEntries++;
        } catch (e) {
          summary.productVariant.failed++;
          console.error(`  [fail] variant ${row.id}:`, e.message);
          nextImages.push(u);
        }
      } else {
        nextImages.push(u);
      }
    }
    if (changed && APPLY) {
      await prisma.productVariant.update({
        where: { id: row.id },
        data: { images: nextImages },
      });
    }
    if (changed) {
      console.log(
        `  productVariant.images id=${row.id} → ${APPLY ? 'updated' : 'would update'}`,
      );
    }
  }
}

// Deep-scan a JSON column for nested base64 and rewrite it on disk.
async function migrateJsonBlob({ table, field, folder, summaryKey }) {
  const rows = await prisma[table].findMany({ select: { id: true, [field]: true } });
  for (const row of rows) {
    summary[summaryKey].scanned++;
    const value = row[field];
    if (value == null) continue;
    const json = JSON.stringify(value);
    if (!json.includes('data:image') && !json.includes('data:application')) continue;
    try {
      const cleaned = await resolveBase64InValue(value, { folder });
      if (JSON.stringify(cleaned) !== json) {
        if (APPLY) {
          await prisma[table].update({ where: { id: row.id }, data: { [field]: cleaned } });
        }
        summary[summaryKey].converted++;
        console.log(
          `  ${table}.${field} id=${row.id} → ${APPLY ? 'uploaded + replaced' : 'would replace'}`,
        );
      }
    } catch (e) {
      summary[summaryKey].failed++;
      console.error(`  [fail] ${table}.${field} id=${row.id}:`, e.message);
    }
  }
}

(async () => {
  console.log(APPLY ? '== APPLY MODE ==' : '== DRY RUN (use --apply to write) ==');

  await migrate('products', 'productImage', 'productImage',
    { where: { url: { startsWith: 'data:' } }, select: { id: true, url: true } },
    { field: 'url', update: (id, url) => prisma.productImage.update({ where: { id }, data: { url } }) });

  await migrateVariantArrays();

  await migrateJsonBlob({
    table: 'product', field: 'qcInspectionData', folder: 'qc-inspections',
    summaryKey: 'productQcInspectionData',
  });

  await migrateJsonBlob({
    table: 'inspection', field: 'itemsToInspect', folder: 'inspections',
    summaryKey: 'inspectionItemsToInspect',
  });

  await migrate('company', 'companyInfo', 'companyInfoLogo',
    { where: { companyLogo: { startsWith: 'data:' } }, select: { id: true, companyLogo: true } },
    { field: 'companyLogo', update: (id, companyLogo) => prisma.companyInfo.update({ where: { id }, data: { companyLogo } }) });

  await migrate('categories', 'category', 'categoryImage',
    { where: { image: { startsWith: 'data:' } }, select: { id: true, image: true } },
    { field: 'image', update: (id, image) => prisma.category.update({ where: { id }, data: { image } }) });

  await migrate('banners', 'bannerImage', 'bannerImage',
    { where: { imageUrl: { startsWith: 'data:' } }, select: { id: true, imageUrl: true } },
    { field: 'imageUrl', update: (id, imageUrl) => prisma.bannerImage.update({ where: { id }, data: { imageUrl } }) });

  await migrate('vendors/owner', 'vendor', 'vendorOwnerPhoto',
    { where: { ownerPhoto: { startsWith: 'data:' } }, select: { id: true, ownerPhoto: true } },
    { field: 'ownerPhoto', update: (id, ownerPhoto) => prisma.vendor.update({ where: { id }, data: { ownerPhoto } }) });

  await migrate('vendors/logo', 'vendor', 'vendorCompanyLogo',
    { where: { companyLogo: { startsWith: 'data:' } }, select: { id: true, companyLogo: true } },
    { field: 'companyLogo', update: (id, companyLogo) => prisma.vendor.update({ where: { id }, data: { companyLogo } }) });

  await migrate('vendors/documents', 'vendorDocument', 'vendorDocument',
    { where: { documentUrl: { startsWith: 'data:' } }, select: { id: true, documentUrl: true } },
    { field: 'documentUrl', update: (id, documentUrl) => prisma.vendorDocument.update({ where: { id }, data: { documentUrl } }) });

  await migrate('vendors/certifications', 'vendorCertification', 'vendorCertification',
    { where: { documentUrl: { startsWith: 'data:' } }, select: { id: true, documentUrl: true } },
    { field: 'documentUrl', update: (id, documentUrl) => prisma.vendorCertification.update({ where: { id }, data: { documentUrl } }) });

  console.log('\n== Summary ==');
  console.log(JSON.stringify(summary, null, 2));

  await prisma.$disconnect();
})().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
