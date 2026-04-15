const { prisma } = require('../config/database');

// Business timezone used when deciding "what year is it?" so codes stay aligned
// with Indian operations even when deployed to a cloud server in UTC.
const BUSINESS_TIMEZONE = 'Asia/Kolkata';
const MIN_PAD_WIDTH = 4;

function getBusinessYear() {
    return parseInt(
        new Date().toLocaleString('en-US', {
            timeZone: BUSINESS_TIMEZONE,
            year: 'numeric',
        }),
        10
    );
}

function formatVendorCode(year, sequence) {
    // padStart never truncates — once we cross 9999 the code naturally grows to
    // 5+ digits. Kept explicit via Math.max to document the intent.
    const digits = String(sequence);
    const width = Math.max(MIN_PAD_WIDTH, digits.length);
    return `VND-${year}-${digits.padStart(width, '0')}`;
}

// Generates a unique, immutable, human-readable vendor code in the format
// `VND-YYYY-NNNN`. Uses an atomic per-year counter document so concurrent
// vendor registrations cannot collide.
//
// Pass a Prisma transaction client (`tx`) to make the counter increment part
// of a surrounding transaction — if the caller's vendor.create later fails,
// the counter increment rolls back and we don't burn a sequence number.
async function generateVendorCode(client = prisma, forYear) {
    const year = forYear ?? getBusinessYear();

    if (!Number.isInteger(year) || year < 2000 || year > 9999) {
        throw new Error(`generateVendorCode: invalid year ${year}`);
    }

    const counterId = `vendor-${year}`;
    const counter = await client.counter.upsert({
        where: { id: counterId },
        create: { id: counterId, value: 1 },
        update: { value: { increment: 1 } },
    });

    return formatVendorCode(year, counter.value);
}

// Reconciles the counter to max(existing vendor sequence) + 1 for the given
// year, then returns a fresh code. Called as a self-heal when the unique
// index rejects a newly-generated code (e.g. counter drifted after a DB
// restore or manual edit).
async function reconcileAndGenerate(client = prisma, forYear) {
    const year = forYear ?? getBusinessYear();
    const prefix = `VND-${year}-`;

    const existing = await client.vendor.findMany({
        where: { vendorCode: { startsWith: prefix } },
        select: { vendorCode: true },
    });

    const maxSeq = existing.reduce((max, { vendorCode }) => {
        const suffix = vendorCode?.slice(prefix.length);
        const n = parseInt(suffix, 10);
        return Number.isFinite(n) && n > max ? n : max;
    }, 0);

    const counterId = `vendor-${year}`;
    const nextValue = maxSeq + 1;
    await client.counter.upsert({
        where: { id: counterId },
        create: { id: counterId, value: nextValue },
        update: { value: nextValue },
    });

    return formatVendorCode(year, nextValue);
}

module.exports = { generateVendorCode, reconcileAndGenerate, formatVendorCode };
