/**
 * Populate the structured text fields (emoji, headerTitle, headerSubtitle,
 * bodyText, buttonLabel, footerText) for every template from the layout
 * registry, rebuild the send-ready bodyHtml, validate variable usage, and sync
 * the seed data file.
 *
 * Re-runnable. Usage:  node prisma/structureEmailTemplates.js
 */
const { PrismaClient } = require('@prisma/client');
const path = require('path');
const fs = require('fs');
const { buildBodyHtml, getEditableDefaults, LAYOUTS } = require('../utils/email/templateLayout');

const prisma = new PrismaClient();

function usedVars(html) {
  const s = new Set();
  for (const m of html.matchAll(/\{\{\s*([\w.]+)\s*\}\}/g)) s.add(m[1]);
  return s;
}

async function main() {
  const seedPath = path.join(__dirname, 'emailTemplatesSeedData.js');
  delete require.cache[require.resolve(seedPath)];
  const seed = require(seedPath);
  const declaredByKey = Object.fromEntries(seed.map((t) => [t.key, new Set(t.variables)]));

  // 1) Validate every composed body only references declared variables
  //    (subject variables are allowed to be a superset).
  let invalid = 0;
  for (const key of Object.keys(LAYOUTS)) {
    const declared = declaredByKey[key];
    if (!declared) { console.log(`  ⚠️  ${key}: not in seed data`); continue; }
    const html = buildBodyHtml(key, getEditableDefaults(key));
    const missing = [...usedVars(html)].filter((v) => !declared.has(v));
    if (missing.length) { invalid++; console.log(`  ❌ ${key}: undeclared vars: ${missing.join(', ')}`); }
  }
  if (invalid) { console.error(`\nAborting — ${invalid} template(s) reference undeclared variables.`); process.exitCode = 1; return; }

  // 2) Update DB rows: structured fields + rebuilt bodyHtml.
  let updated = 0;
  for (const key of Object.keys(LAYOUTS)) {
    const d = getEditableDefaults(key);
    const bodyHtml = buildBodyHtml(key, d);
    const res = await prisma.emailTemplate.updateMany({
      where: { key },
      data: {
        emoji: d.emoji,
        headerTitle: d.headerTitle,
        headerSubtitle: d.headerSubtitle,
        bodyText: d.bodyText,
        buttonLabel: d.buttonLabel || null,
        footerText: d.footerText,
        bodyHtml,
      },
    });
    if (res.count) { updated++; console.log(`  ✓ structured  ${key}`); }
    else console.log(`  = no row for  ${key} (run seed first)`);
  }

  // 3) Sync the seed data file so fresh environments match.
  const newSeed = seed.map((t) => {
    const d = getEditableDefaults(t.key);
    if (!d) return t;
    return {
      ...t,
      emoji: d.emoji,
      headerTitle: d.headerTitle,
      headerSubtitle: d.headerSubtitle,
      bodyText: d.bodyText,
      buttonLabel: d.buttonLabel || null,
      footerText: d.footerText,
      bodyHtml: buildBodyHtml(t.key, d),
    };
  });
  const header = fs.readFileSync(seedPath, 'utf8').split('module.exports')[0];
  fs.writeFileSync(seedPath, header + 'module.exports = ' + JSON.stringify(newSeed, null, 2) + ';\n');

  console.log(`\nDone. DB updated=${updated}. Seed file re-synced with structured fields.`);
}

main()
  .catch((e) => { console.error('Structure migration failed:', e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
