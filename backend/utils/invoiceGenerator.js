/**
 * Invoice Number Generator
 * ─────────────────────────────────────────────────────────────────────────────
 * Reads the InvoiceSettings, performs auto-rollover if needed, generates the
 * next formatted invoice number, and atomically increments the sequence.
 *
 * Usage:
 *   const { generateInvoiceNo } = require('../utils/invoiceGenerator');
 *   const invoiceNo = await generateInvoiceNo(prisma);
 */

/**
 * Compute FY start/end from a month+day anchor.
 * Mirrors the logic in invoiceSettingsController.js.
 * @param {number} month 1-indexed month (e.g. 4 = April)
 * @param {number} day   day of month
 * @param {Date}   [ref] reference date (defaults to now)
 */
const computeFYDates = (month, day, ref = new Date()) => {
    let startYear = ref.getFullYear();
    let fyStart = new Date(startYear, month - 1, day);

    if (ref < fyStart) {
        startYear--;
        fyStart = new Date(startYear, month - 1, day);
    }

    const nextFYStart = new Date(startYear + 1, month - 1, day);
    const fyEnd = new Date(nextFYStart.getTime() - 1); // 23:59:59.999 day before

    return { start: fyStart, end: fyEnd };
};

/**
 * Build a FY label string from start/end dates.
 * E.g. "2024-25" for Apr 2024 – Mar 2025
 */
const fyLabel = (start, end) =>
    `${new Date(start).getFullYear()}-${String(new Date(end).getFullYear()).slice(-2)}`;

/**
 * Apply the format template with given values.
 * Supported placeholders: {PREFIX}, {FY}, {SEQ}
 */
const applyTemplate = (template, prefix, fy, seq, seqLen) =>
    template
        .replace('{PREFIX}', prefix)
        .replace('{FY}', fy)
        .replace('{SEQ}', String(seq).padStart(seqLen, '0'));

/**
 * Generate the next invoice number.
 * This is the main exported function — call it inside order creation.
 *
 * @param {import('@prisma/client').PrismaClient} prisma
 * @returns {Promise<string>} formatted invoice number e.g. "INV-2024-25-0001"
 */
const generateInvoiceNo = async (prisma) => {
    // 1. Load current settings (create defaults if missing)
    let settings = await prisma.invoiceSettings.findFirst();

    if (!settings) {
        const month = 4;
        const day = 1;
        const { start, end } = computeFYDates(month, day);
        settings = await prisma.invoiceSettings.create({
            data: {
                invoicePrefix: 'INV',
                sequenceLength: 4,
                currentSequence: 1,
                autoFinancialYear: true,
                financialYearStartMonth: month,
                financialYearStartDay: day,
                financialYearStart: start,
                financialYearEnd: end,
                formatTemplate: '{PREFIX}-{FY}-{SEQ}',
            },
        });
    }

    const now = new Date();

    // 2. Auto-rollover: if today is past FY end and auto mode is on
    if (settings.autoFinancialYear && now > settings.financialYearEnd) {
        const month = settings.financialYearStartMonth ?? 4;
        const day = settings.financialYearStartDay ?? 1;
        const { start, end } = computeFYDates(month, day, now);

        console.log(`🔄 Invoice FY rollover: ${start.toDateString()} → ${end.toDateString()}`);

        settings = await prisma.invoiceSettings.update({
            where: { id: settings.id },
            data: {
                financialYearStart: start,
                financialYearEnd: end,
                currentSequence: 1,  // reset for new FY
            },
        });
    }

    // 3. Snapshot current sequence, then atomically increment
    const currentSeq = settings.currentSequence;

    await prisma.invoiceSettings.update({
        where: { id: settings.id },
        data: { currentSequence: { increment: 1 } },
    });

    // 4. Build and return the invoice number
    const fy = fyLabel(settings.financialYearStart, settings.financialYearEnd);
    const invoiceNo = applyTemplate(
        settings.formatTemplate,
        settings.invoicePrefix,
        fy,
        currentSeq,
        settings.sequenceLength
    );

    console.log(`🧾 Generated invoice number: ${invoiceNo}`);
    return invoiceNo;
};

module.exports = { generateInvoiceNo };
