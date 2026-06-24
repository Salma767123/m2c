const { prisma } = require('../config/database');
const { sendLowStockAlertEmail } = require('./email/vendorEmailSender');

// Build the variant label the same way the UI does.
const variantLabel = (v) =>
  (v.variantName && v.variantName.trim()) ||
  [v.size, v.color].filter(Boolean).join(' / ') ||
  'Variant';

/**
 * Evaluate an inventory item's stock (variant-aware) and email the vendor when
 * it crosses into a low-stock state. Deduped via Inventory.lowStockAlertedAt so
 * the vendor gets ONE email per low-stock episode (reset once restocked above
 * the alert level). Fire-and-forget — never throws into the caller.
 *
 * Low-stock rule (matches the dashboard/table logic):
 *   • products with variants → low if ANY variant is at/below its alert level
 *     (variant.lowStockThreshold ?? item.lowStockAlert)
 *   • products without variants → low if currentStock is at/below lowStockAlert
 */
async function checkAndAlertLowStock(inventoryId) {
  try {
    const item = await prisma.inventory.findUnique({
      where: { id: inventoryId },
      include: {
        products: {
          select: {
            name: true,
            baseSku: true,
            variants: { select: { variantName: true, size: true, color: true, sku: true, stock: true, lowStockThreshold: true } },
          },
          take: 1,
        },
        vendor: { select: { companyName: true, ownerName: true, businessEmail: true, email: true } },
      },
    });
    if (!item || !item.vendor) return;

    const product = item.products?.[0] || null;
    const variants = product?.variants || [];

    // Determine low units + overall low state.
    const lowUnits = [];
    let isLow = false;
    let isOut = false;

    if (variants.length > 0) {
      const allZero = variants.every(v => (v.stock || 0) === 0) && (item.baseStock || 0) === 0;
      isOut = allZero;
      for (const v of variants) {
        const threshold = v.lowStockThreshold ?? item.lowStockAlert;
        if ((v.stock || 0) > 0 && (v.stock || 0) <= threshold) {
          isLow = true;
          lowUnits.push({ label: variantLabel(v), sku: v.sku, stock: v.stock || 0, threshold });
        }
      }
      isLow = isLow && !allZero;
    } else {
      const low = (item.currentStock || 0) > 0 && (item.currentStock || 0) <= item.lowStockAlert;
      isOut = (item.currentStock || 0) === 0;
      if (low) {
        isLow = true;
        lowUnits.push({ label: product?.name || item.name, sku: item.sku, stock: item.currentStock || 0, threshold: item.lowStockAlert });
      }
    }

    // Recovered above the alert level → reset so the next episode can alert again.
    if (!isLow && !isOut) {
      if (item.lowStockAlertedAt) {
        await prisma.inventory.update({ where: { id: item.id }, data: { lowStockAlertedAt: null } });
      }
      return;
    }

    // Already alerted for this low-stock episode → don't spam.
    if (!isLow || item.lowStockAlertedAt) return;

    const to = item.vendor.businessEmail || item.vendor.email;
    if (!to) return;

    await sendLowStockAlertEmail({
      to,
      companyName: item.vendor.companyName,
      ownerName: item.vendor.ownerName,
      productName: product?.name || item.name,
      category: item.category,
      sku: item.sku,
      currentStock: item.currentStock || 0,
      minStock: item.lowStockAlert,
      lowUnits,
    });

    await prisma.inventory.update({ where: { id: item.id }, data: { lowStockAlertedAt: new Date() } });
    console.log(`📧 Low-stock alert emailed to ${to} for inventory ${item.id}`);
  } catch (err) {
    console.error('Low-stock alert check failed:', err.message);
  }
}

module.exports = { checkAndAlertLowStock };
