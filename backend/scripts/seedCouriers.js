/**
 * Seed the courier catalogue with the previously hard-coded partners so existing
 * products keep showing couriers after the switch to admin-managed couriers.
 * Idempotent: skips a courier whose name already exists.
 *
 * Run: node scripts/seedCouriers.js
 */
const { prisma } = require('../config/database');

const SEED = [
  // Domestic (India, .in)
  { name: 'Blue Dart', code: 'BD', color: '#0B4DA2', region: 'IN', modes: ['AIR'], sortOrder: 1 },
  { name: 'Delhivery', code: 'DL', color: '#C8102E', region: 'IN', modes: ['AIR', 'SHIP'], sortOrder: 2 },
  { name: 'DTDC', code: 'DT', color: '#E4032E', region: 'IN', modes: ['AIR', 'SHIP'], sortOrder: 3 },
  { name: 'Gati', code: 'GT', color: '#1D4E8F', region: 'IN', modes: ['SHIP'], sortOrder: 4 },
  // International (.com)
  { name: 'DHL Express', code: 'DHL', color: '#D40511', region: 'US', modes: ['AIR'], sortOrder: 1 },
  { name: 'FedEx', code: 'FX', color: '#4D148C', region: 'US', modes: ['AIR'], sortOrder: 2 },
  { name: 'UPS', code: 'UPS', color: '#4E2A1E', region: 'US', modes: ['AIR'], sortOrder: 3 },
  { name: 'Maersk', code: 'MK', color: '#0091DA', region: 'US', modes: ['SHIP'], sortOrder: 4 },
  { name: 'DHL Ocean', code: 'DHL', color: '#D40511', region: 'US', modes: ['SHIP'], sortOrder: 5 },
];

(async () => {
  let created = 0;
  for (const c of SEED) {
    const existing = await prisma.courier.findFirst({ where: { name: c.name } });
    if (existing) {
      console.log(`skip (exists): ${c.name}`);
      continue;
    }
    await prisma.courier.create({ data: { ...c, isActive: true } });
    created += 1;
    console.log(`created: ${c.name} (${c.region})`);
  }
  const total = await prisma.courier.count();
  console.log(`\nDone. Created ${created}. Total couriers in DB: ${total}`);
  process.exit(0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
