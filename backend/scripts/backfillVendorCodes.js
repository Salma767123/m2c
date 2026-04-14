/**
 * Backfill vendorCode for all existing vendors.
 *
 * DEPLOYMENT ORDER (required to avoid MongoDB unique-null collision):
 *
 *   1. In prisma/schema.prisma, temporarily remove `@unique` from `vendorCode`
 *      (leave the field itself). Run `npx prisma db push` to create the field
 *      and the Counter collection.
 *   2. Run this script:  node scripts/backfillVendorCodes.js
 *   3. Restore `@unique` on `vendorCode` in the schema and run
 *      `npx prisma db push` again to create the unique index.
 *
 * Vendors are processed in createdAt ASC order so the oldest vendor gets the
 * lowest sequence number within its business year. Idempotent: vendors that
 * already have a vendorCode are skipped.
 */

const { prisma } = require('../config/database');
const { generateVendorCode } = require('../utils/vendorCodeGenerator');

const BUSINESS_TIMEZONE = 'Asia/Kolkata';

function getYearForDate(date) {
    return parseInt(
        new Date(date).toLocaleString('en-US', {
            timeZone: BUSINESS_TIMEZONE,
            year: 'numeric',
        }),
        10
    );
}

async function main() {
    const vendors = await prisma.vendor.findMany({
        where: { vendorCode: null },
        select: { id: true, createdAt: true, companyName: true },
        orderBy: { createdAt: 'asc' },
    });

    if (vendors.length === 0) {
        console.log('No vendors require backfill.');
        return;
    }

    console.log(`Backfilling vendorCode for ${vendors.length} vendor(s)...`);

    let assigned = 0;
    for (const vendor of vendors) {
        const year = getYearForDate(vendor.createdAt);
        const code = await generateVendorCode(year);
        await prisma.vendor.update({
            where: { id: vendor.id },
            data: { vendorCode: code },
        });
        assigned += 1;
        console.log(`  ${code}  ${vendor.companyName} (${vendor.id})`);
    }

    console.log(`Done. Assigned ${assigned} vendor code(s).`);
}

main()
    .catch((err) => {
        console.error('Backfill failed:', err);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
