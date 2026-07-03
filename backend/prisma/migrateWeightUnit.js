/**
 * One-shot migration: backfill weightUnit for existing products where it is null.
 * Parses the unit embedded in the weight string (e.g. "850 g" → "g", "1.6 kg" → "kg").
 * Products with bare numbers (e.g. "250") are left unchanged — no unit to infer.
 *
 * Run once: node backend/prisma/migrateWeightUnit.js
 */

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

// Returns the unit string if detectable, or null.
function parseUnit(weight) {
  if (!weight) return null
  const w = weight.trim()

  // Match patterns like "850 g", "350g", "700 grams", "280 g/m²", "155 g/m²"
  if (/\d[\s]*(grams?)(\/m²|\/m2)?(\s|$|\s*\()/i.test(w)) return 'g'
  if (/\d[\s]*g(\/m²|\/m2)?(\s|$|\s*\()/i.test(w)) return 'g'
  // Match patterns like "1.6 kg", "2.5kg", "1.6 kg (set)"
  if (/\d[\s]*kg(\s|$|\s*\()/i.test(w)) return 'kg'
  // Match patterns like "2.5 lb", "12lb"
  if (/\d[\s]*lb(\s|$|\s*\()/i.test(w)) return 'lb'
  // Match patterns like "12 oz"
  if (/\d[\s]*oz(\s|$|\s*\()/i.test(w)) return 'oz'

  return null
}

async function main() {
  const products = await prisma.product.findMany({
    where: { OR: [{ weightUnit: null }, { weightUnit: { isSet: false } }] },
    select: { id: true, name: true, baseSku: true, weight: true },
  })

  console.log(`Found ${products.length} products with weightUnit = null`)

  let updated = 0
  let skipped = 0

  for (const p of products) {
    const unit = parseUnit(p.weight)
    if (!unit) {
      console.log(`  SKIP  ${p.baseSku || p.id}  weight="${p.weight}" — no unit detectable`)
      skipped++
      continue
    }

    await prisma.product.update({
      where: { id: p.id },
      data: { weightUnit: unit },
    })
    console.log(`  SET   ${p.baseSku || p.id}  weight="${p.weight}" → weightUnit="${unit}"`)
    updated++
  }

  console.log(`\nDone — updated: ${updated}, skipped: ${skipped}`)
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
