// Recompute every product's `reviews` count and `rating` average from its
// APPROVED reviews. Fixes aggregates that drifted (e.g. after reviews were
// deduped/deleted without recalculation).
const { prisma } = require('../config/database');

(async () => {
  try {
    const products = await prisma.product.findMany({ select: { id: true, reviews: true, rating: true } });
    let fixed = 0;
    for (const p of products) {
      const approved = await prisma.review.findMany({
        where: { productId: p.id, status: 'APPROVED' },
        select: { rating: true },
      });
      const count = approved.length;
      const avg = count ? approved.reduce((s, r) => s + (r.rating || 0), 0) / count : 0;
      const roundedAvg = Math.round(avg * 10) / 10;
      if ((p.reviews || 0) !== count || (p.rating || 0) !== roundedAvg) {
        await prisma.product.update({ where: { id: p.id }, data: { reviews: count, rating: roundedAvg } });
        fixed++;
      }
    }
    console.log(`Products checked: ${products.length}, corrected: ${fixed}`);
  } catch (e) {
    console.error('Recalc failed:', e.message);
  } finally {
    await prisma.$disconnect();
  }
})();
