const { prisma } = require('../config/database');

// Mirrors categoryController's slug rule so vendor-proposed rows look identical
// to admin-created ones.
const slugify = (name) =>
  String(name)
    .toLowerCase()
    .replace(/[^a-z0-9 -]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();

// `slug` is @unique — walk a numeric suffix until we find a free one.
const uniqueSlug = async (base) => {
  const root = base || 'category';
  let slug = root;
  let n = 1;
  // eslint-disable-next-line no-await-in-loop
  while (await prisma.category.findUnique({ where: { slug } })) {
    n += 1;
    slug = `${root}-${n}`;
  }
  return slug;
};

/**
 * Turn a vendor's free-text "Other" categories (registration Step 4) into real
 * Category rows with status PENDING, so the admin can approve or merge them
 * from the Categories module instead of the name living only in vendor JSON.
 *
 * Deliberately conservative:
 *  - dedupes case-insensitively against the WHOLE existing taxonomy (any
 *    status), so "terry towel" never shadows an existing "TERRY TOWELS",
 *  - PENDING rows are invisible to the storefront (see categoryController's
 *    visibility gate) — only the proposing vendor and admins see them,
 *  - never throws into the caller: a taxonomy hiccup must not fail vendor
 *    registration/update.
 *
 * @returns {Promise<string[]>} names of the categories actually created.
 */
async function syncVendorCustomCategories(vendorId, additionalCategories) {
  const created = [];
  try {
    if (!Array.isArray(additionalCategories) || additionalCategories.length === 0) return created;

    const names = [
      ...new Set(
        additionalCategories
          .map((c) => (typeof c?.name === 'string' ? c.name.trim() : ''))
          .filter(Boolean),
      ),
    ];
    if (names.length === 0) return created;

    const existing = await prisma.category.findMany({ select: { name: true } });
    const taken = new Set(existing.map((c) => c.name.toLowerCase()));

    for (const name of names) {
      if (taken.has(name.toLowerCase())) continue; // already in the taxonomy — reuse it
      // eslint-disable-next-line no-await-in-loop
      const slug = await uniqueSlug(slugify(name));
      // eslint-disable-next-line no-await-in-loop
      await prisma.category.create({
        data: {
          name,
          description: 'Vendor-proposed category — awaiting admin review.',
          slug,
          status: 'PENDING',
          isCustom: true,
          createdByVendorId: vendorId,
        },
      });
      taken.add(name.toLowerCase());
      created.push(name);
    }
  } catch (error) {
    console.error('[customCategories] Failed to sync vendor custom categories:', error.message);
  }
  return created;
}

module.exports = { syncVendorCustomCategories, slugify, uniqueSlug };
