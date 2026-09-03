const { prisma } = require('../config/database');

/**
 * Generate a unique human return id: RET-YYYY-NNNNNN.
 *
 * Sequence is derived from the count of this year's requests + 1, with a short
 * random suffix retry on the off chance of a race (returnId is @unique, so a
 * collision would otherwise throw on create). Mirrors the ORD- id shape.
 */
async function generateReturnId() {
    const year = new Date().getFullYear();
    for (let attempt = 0; attempt < 6; attempt++) {
        let candidate;
        if (attempt === 0) {
            const count = await prisma.returnRequest.count({
                where: { returnId: { startsWith: `RET-${year}-` } },
            });
            candidate = `RET-${year}-${String(count + 1).padStart(6, '0')}`;
        } else {
            // Fall back to a random sequence if the counted one is taken.
            const rand = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
            candidate = `RET-${year}-${rand}`;
        }
        const exists = await prisma.returnRequest.findUnique({ where: { returnId: candidate } });
        if (!exists) return candidate;
    }
    // Extremely unlikely — timestamp-based last resort.
    return `RET-${year}-${Date.now().toString().slice(-6)}`;
}

module.exports = { generateReturnId };
