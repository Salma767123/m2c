const { prisma } = require('../config/database');

const OBJECT_ID_RE = /^[0-9a-fA-F]{24}$/;

// Normalizes an array of category values (IDs and/or names) to clean names.
// 24-hex-char ObjectIds are looked up in the Category collection; unresolvable
// IDs are dropped. Non-ID strings pass through unchanged.
async function normalizeCategoryValues(values) {
    if (!Array.isArray(values)) return [];

    const deduped = [
        ...new Set(
            values.filter((v) => typeof v === 'string' && v.trim().length > 0)
        ),
    ];

    const ids = deduped.filter((v) => OBJECT_ID_RE.test(v));
    if (ids.length === 0) return deduped;

    const categories = await prisma.category.findMany({
        where: { id: { in: ids } },
        select: { id: true, name: true },
    });
    const idToName = Object.fromEntries(categories.map((c) => [c.id, c.name]));

    return deduped
        .map((v) => (OBJECT_ID_RE.test(v) ? idToName[v] : v))
        .filter(Boolean);
}

module.exports = { normalizeCategoryValues, OBJECT_ID_RE };
