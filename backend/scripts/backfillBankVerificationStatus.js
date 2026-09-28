// Backfill verificationStatus on bank details created before the penny-drop
// handshake existed: verified rows → VERIFIED, everything else → PENDING.
const { prisma } = require('../config/database');

(async () => {
  try {
    const res = await prisma.$runCommandRaw({
      update: 'vendor_bank_details',
      updates: [
        { q: { verificationStatus: { $exists: false }, isVerified: true }, u: { $set: { verificationStatus: 'VERIFIED' } }, multi: true },
        { q: { verificationStatus: { $exists: false } }, u: { $set: { verificationStatus: 'PENDING' } }, multi: true },
        { q: { verificationStatus: null, isVerified: true }, u: { $set: { verificationStatus: 'VERIFIED' } }, multi: true },
        { q: { verificationStatus: null }, u: { $set: { verificationStatus: 'PENDING' } }, multi: true },
      ],
    });
    console.log('Backfill result:', JSON.stringify(res));
  } catch (e) {
    console.error('Backfill failed:', e.message);
  } finally {
    await prisma.$disconnect();
  }
})();
