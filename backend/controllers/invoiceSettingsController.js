const { prisma } = require('../config/database');

// ============================================================
// FINANCIAL YEAR HELPERS
// ============================================================

/**
 * Calculate FY start and end for a given anchor month/day.
 * Returns the FY that contains `referenceDate`.
 *
 * Example: month=4, day=1 (April 1st, Indian FY)
 *   referenceDate = 2025-02-10 → FY starts 2024-04-01, ends 2025-03-31
 *   referenceDate = 2025-05-10 → FY starts 2025-04-01, ends 2026-03-31
 */
const computeFYDates = (month, day, referenceDate = new Date()) => {
    // month is 1-indexed (April = 4)
    const refYear = referenceDate.getFullYear();

    // Try the FY that started this calendar year
    let startYear = refYear;
    let fyStart = new Date(startYear, month - 1, day); // month-1 for 0-indexed JS Date

    // If the reference date is before this year's FY start, go back one year
    if (referenceDate < fyStart) {
        startYear = refYear - 1;
        fyStart = new Date(startYear, month - 1, day);
    }

    // FY end = one day before the same anchor date next year
    const nextFYStart = new Date(startYear + 1, month - 1, day);
    const fyEnd = new Date(nextFYStart.getTime() - 1); // 1 ms before midnight = 23:59:59.999

    return { start: fyStart, end: fyEnd, startYear };
};

/**
 * Check if today is past the stored FY end.
 * If so and autoFinancialYear is on, roll to next FY and reset sequence.
 */
const rolloverIfNeeded = async (settings) => {
    if (!settings.autoFinancialYear) return settings;

    const now = new Date();
    if (now <= settings.financialYearEnd) return settings; // still inside current FY

    // Need to roll forward — compute new FY containing today
    const month = settings.financialYearStartMonth ?? 4;
    const day = settings.financialYearStartDay ?? 1;
    const { start, end } = computeFYDates(month, day, now);

    console.log(`🔄 Auto FY rollover: new FY ${start.toDateString()} → ${end.toDateString()}`);

    const updated = await prisma.invoiceSettings.update({
        where: { id: settings.id },
        data: {
            financialYearStart: start,
            financialYearEnd: end,
            currentSequence: 1,   // reset sequence at new FY
        },
    });

    return updated;
};

// Default settings used when creating for the first time
const getDefaultSettings = () => {
    const month = 4; // April
    const day = 1;
    const { start, end } = computeFYDates(month, day);
    return {
        invoicePrefix: 'INV',
        sequenceLength: 4,
        currentSequence: 1,
        autoFinancialYear: true,
        financialYearStartMonth: month,
        financialYearStartDay: day,
        financialYearStart: start,
        financialYearEnd: end,
        formatTemplate: '{PREFIX}-{FY}-{SEQ}',
    };
};

// ============================================================
// GET Invoice Settings
// ============================================================
const getInvoiceSettings = async (req, res) => {
    try {
        let settings = await prisma.invoiceSettings.findFirst();

        if (!settings) {
            settings = await prisma.invoiceSettings.create({
                data: getDefaultSettings(),
            });
        }

        // Auto-rollover on every fetch — no cron needed
        settings = await rolloverIfNeeded(settings);

        res.json({ success: true, data: settings });
    } catch (error) {
        console.error('Get Invoice Settings error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch invoice settings' });
    }
};

// ============================================================
// UPDATE Invoice Settings
// ============================================================
const updateInvoiceSettings = async (req, res) => {
    try {
        const {
            invoicePrefix,
            sequenceLength,
            currentSequence,
            autoFinancialYear,
            financialYearStartMonth,  // 1-12
            financialYearStartDay,    // 1-31
            financialYearStart,       // ISO date string (manual mode only)
            formatTemplate,
        } = req.body;

        let settings = await prisma.invoiceSettings.findFirst();
        if (!settings) {
            return res.status(404).json({ success: false, error: 'Invoice settings not found' });
        }

        const updateData = {};

        if (invoicePrefix !== undefined) updateData.invoicePrefix = invoicePrefix;
        if (sequenceLength !== undefined) updateData.sequenceLength = parseInt(sequenceLength);
        if (currentSequence !== undefined) updateData.currentSequence = parseInt(currentSequence);
        if (autoFinancialYear !== undefined) updateData.autoFinancialYear = autoFinancialYear;
        if (formatTemplate !== undefined) updateData.formatTemplate = formatTemplate;

        const isAuto = autoFinancialYear ?? settings.autoFinancialYear;

        if (isAuto) {
            // Use provided month/day or fall back to existing values
            const month = financialYearStartMonth !== undefined
                ? parseInt(financialYearStartMonth)
                : (settings.financialYearStartMonth ?? 4);
            const day = financialYearStartDay !== undefined
                ? parseInt(financialYearStartDay)
                : (settings.financialYearStartDay ?? 1);

            const { start, end } = computeFYDates(month, day);

            updateData.financialYearStartMonth = month;
            updateData.financialYearStartDay = day;
            updateData.financialYearStart = start;
            updateData.financialYearEnd = end;
        } else {
            // Manual mode — admin provides a full date string
            if (financialYearStart) {
                const start = new Date(financialYearStart);
                // End = same month/day next year minus 1 ms
                const nextFYStart = new Date(
                    start.getFullYear() + 1,
                    start.getMonth(),
                    start.getDate()
                );
                const end = new Date(nextFYStart.getTime() - 1);
                updateData.financialYearStart = start;
                updateData.financialYearEnd = end;
            }
        }

        const updated = await prisma.invoiceSettings.update({
            where: { id: settings.id },
            data: updateData,
        });

        res.json({
            success: true,
            message: 'Invoice settings updated successfully',
            data: updated,
        });
    } catch (error) {
        console.error('Update Invoice Settings error:', error);
        res.status(500).json({ success: false, error: 'Failed to update invoice settings' });
    }
};

module.exports = {
    getInvoiceSettings,
    updateInvoiceSettings,
};
