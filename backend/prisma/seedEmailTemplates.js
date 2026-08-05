/**
 * Seed the EmailTemplate collection from emailTemplatesSeedData.js.
 *
 * Idempotent & non-destructive: only CREATES templates whose `key` doesn't
 * exist yet. Existing templates are left untouched so admin edits (subject,
 * body, enabled, fromName) are never overwritten on re-run.
 *
 * Usage:  node prisma/seedEmailTemplates.js
 *         node prisma/seedEmailTemplates.js --force-structure   (also refresh
 *              name/description/variables/category/sortOrder/isSecurity on
 *              existing rows, but keep subject/body/enabled/fromName)
 */
const { PrismaClient } = require('@prisma/client');
const templates = require('./emailTemplatesSeedData');

const prisma = new PrismaClient();
const forceStructure = process.argv.includes('--force-structure');

async function main() {
  let created = 0;
  let skipped = 0;
  let refreshed = 0;

  for (const t of templates) {
    const existing = await prisma.emailTemplate.findUnique({ where: { key: t.key } });

    if (!existing) {
      await prisma.emailTemplate.create({ data: t });
      created++;
      console.log(`  + created  ${t.category.padEnd(14)} ${t.key}`);
      continue;
    }

    if (forceStructure) {
      // Refresh only the structural metadata; preserve editable content.
      await prisma.emailTemplate.update({
        where: { key: t.key },
        data: {
          name: t.name,
          description: t.description,
          category: t.category,
          variables: t.variables,
          isSecurity: t.isSecurity,
          sortOrder: t.sortOrder,
        },
      });
      refreshed++;
      console.log(`  ~ refreshed ${t.category.padEnd(14)} ${t.key}`);
    } else {
      skipped++;
      console.log(`  = skipped  ${t.key} (already exists)`);
    }
  }

  console.log(`\nDone. created=${created} refreshed=${refreshed} skipped=${skipped} total=${templates.length}`);
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
