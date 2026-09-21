// One-off migration helper: the Review model moved from a per-order unique key
// (userId, productId, orderId) to a lifetime per-product key (userId, productId).
// Any customer who reviewed the same product across two orders now violates the
// new unique index. Keep one review per (userId, productId) — prefer an APPROVED
// one, else the most recent — and delete the rest so the index can build.
const { prisma } = require('../config/database');

(async () => {
  const all = await prisma.review.findMany({ orderBy: { createdAt: 'desc' } });
  const byKey = new Map();
  for (const r of all) {
    const k = `${r.userId}_${r.productId}`;
    if (!byKey.has(k)) byKey.set(k, []);
    byKey.get(k).push(r);
  }
  const toDelete = [];
  for (const [, group] of byKey) {
    if (group.length === 1) continue;
    const approved = group.find((g) => g.status === 'APPROVED');
    const keeper = approved || group[0]; // group is desc by createdAt
    for (const g of group) if (g.id !== keeper.id) toDelete.push(g.id);
  }
  console.log(`Duplicate reviews to delete: ${toDelete.length}`);
  if (toDelete.length) {
    const res = await prisma.review.deleteMany({ where: { id: { in: toDelete } } });
    console.log(`Deleted ${res.count}`);
  }
  await prisma.$disconnect();
})().catch((e) => { console.error(e); process.exit(1); });
