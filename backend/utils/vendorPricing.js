const { prisma } = require('../config/database');

/**
 * Derives each order item's VENDOR price — the amount the vendor originally set
 * for the product — and attaches `vendorUnitPrice` / `vendorTotalPrice` to each
 * item (mutates in place).
 *
 * This deliberately mirrors the settlement logic in orderController
 * (`Settlement.amount` is built from `Product.basePrice`), so everything the
 * vendor sees — orders, revenue, reports — matches what they actually get paid.
 * The stored `unitPrice`/`totalPrice` on the order item are the admin/customer
 * selling price and must NEVER be shown in the vendor panel.
 *
 * Resolution order: product.basePrice → variant.price → stored unitPrice (fallback
 * only, in case base data is missing for legacy rows).
 */
async function attachVendorPrices(items) {
    if (!Array.isArray(items) || items.length === 0) return items;

    const productIds = [...new Set(items.map(i => i.productId).filter(Boolean))];
    const variantIds = [...new Set(items.map(i => i.variantId).filter(Boolean))];

    const [products, variants] = await Promise.all([
        productIds.length
            ? prisma.product.findMany({
                where: { id: { in: productIds } },
                select: { id: true, basePrice: true },
            })
            : [],
        variantIds.length
            ? prisma.productVariant.findMany({
                where: { id: { in: variantIds } },
                select: { id: true, price: true },
            })
            : [],
    ]);

    const basePriceById = new Map(products.map(p => [p.id, p.basePrice]));
    const variantPriceById = new Map(variants.map(v => [v.id, v.price]));

    for (const item of items) {
        const base = basePriceById.get(item.productId);
        const variantPrice = item.variantId ? variantPriceById.get(item.variantId) : undefined;
        const unit = (typeof base === 'number' && base > 0)
            ? base
            : (typeof variantPrice === 'number' && variantPrice > 0)
                ? variantPrice
                : (item.unitPrice || 0);
        item.vendorUnitPrice = unit;
        item.vendorTotalPrice = unit * (item.quantity || 0);
    }

    return items;
}

module.exports = { attachVendorPrices };
