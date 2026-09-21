// Backfill: damaged_stock rows created before the RTV lifecycle existed have no
// vendorReturnStatus (absent/null). Set them to AT_HUB so status filtering and
// aggregation treat them as freshly at the hub, pending return to the vendor.
const { prisma } = require('../config/database');

(async () => {
  try {
    const res = await prisma.$runCommandRaw({
      update: 'damaged_stock',
      updates: [
        { q: { vendorReturnStatus: { $exists: false } }, u: { $set: { vendorReturnStatus: 'AT_HUB' } }, multi: true },
        { q: { vendorReturnStatus: null }, u: { $set: { vendorReturnStatus: 'AT_HUB' } }, multi: true },
      ],
    });
    console.log('Backfill result:', JSON.stringify(res));
  } catch (e) {
    console.error('Backfill failed:', e.message);
  } finally {
    await prisma.$disconnect();
  }
})();
