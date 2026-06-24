'use strict';
/**
 * Creates a sparse unique index on vendors.gstNumber via Prisma's
 * $runCommandRaw (no separate mongodb driver needed).
 *
 * Sparse means: documents where gstNumber is null (unregistered vendors) are
 * excluded from the index entirely — multiple nulls are allowed. Documents with
 * a non-null gstNumber must be unique.
 *
 * Run once (idempotent — MongoDB returns ok:1 if the index already exists
 * with the same options):
 *   node scripts/createGstIndex.js
 */

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Drop any previous attempt so we can re-create with correct options.
  await prisma.$runCommandRaw({
    dropIndexes: 'vendors',
    index: 'vendors_gstNumber_sparse_unique',
  }).catch(() => {}); // ignore "index not found"

  // Partial unique index: only indexes documents where gstNumber is a non-null
  // string. Documents with gstNumber === null are excluded entirely, so multiple
  // unregistered vendors can coexist without triggering the uniqueness constraint.
  const result = await prisma.$runCommandRaw({
    createIndexes: 'vendors',
    indexes: [
      {
        key: { gstNumber: 1 },
        name: 'vendors_gstNumber_partial_unique',
        unique: true,
        partialFilterExpression: { gstNumber: { $type: 'string' } },
      },
    ],
  });
  console.log('createIndexes result:', JSON.stringify(result));
}

main()
  .catch((err) => {
    console.error('Error creating GST index:', err.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
