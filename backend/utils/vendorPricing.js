const { prisma } = require('../config/database');

/**
 * Order-item fields holding the ADMIN/CUSTOMER selling price. M2C buys from the vendor
 * and resells at a markup, so these are commercially confidential: a vendor who sees
 * them learns M2C's margin. They are deleted from every item this helper touches.
 *
 * `totalPriceINR` is included because it is just `totalPrice` at the order's frozen
 * rate — same secret, different unit.
 */
const SELLING_PRICE_FIELDS = ['unitPrice', 'totalPrice', 'totalPriceINR'];

/**
 * Derives each order item's VENDOR price — the amount the vendor originally set
 * for the product — attaches `vendorUnitPrice` / `vendorTotalPrice`, and REMOVES the
 * selling-price fields (mutates in place).
 *
 * This deliberately mirrors the settlement logic in orderController
 * (`Settlement.amount` is built from `Product.basePrice`), so everything the
 * vendor sees — orders, revenue, reports — matches what they actually get paid.
 *
 * Stripping is part of the contract, not a nicety. While this helper was additive-only
 * the frontend carried `vendorUnitPrice ?? unitPrice` fallbacks, so any response that
 * forgot to call it silently rendered M2C's selling price in the vendor's UI. Deleting
 * the fields makes that failure mode loud (an undefined price) instead of silent.
 *
 * WRITE PATHS MUST NOT USE THIS. Copying items between records (e.g. reship) needs the
 * real unitPrice — read those rows with their own query.
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

        // Read the selling price above (legacy fallback), then drop it — it must not
        // reach the vendor. Done last so the fallback still works.
        for (const field of SELLING_PRICE_FIELDS) {
            delete item[field];
        }
    }

    return items;
}

/**
 * Product/ProductVariant fields holding the ADMIN's selling price. The vendor sets
 * `basePrice` (products) / `price` (variants); everything below is what M2C resells at,
 * so it reveals M2C's margin on the vendor's own goods.
 *
 * `originalPrice` (MRP) and `discount` are stripped too. approveProduct overwrites
 * `originalPrice` with M2C's MRP, and MRP x (1 - discount/100) reconstructs the selling
 * price — the "derivable leak". The vendor never enters or edits these (their form has no
 * such fields), so removing them is safe. Vendors instead see their own payout economics
 * via attachVendorPayout: base price, the GST they're paid, and the total.
 */
const ADMIN_PRICE_FIELDS = [
    'adminFixedPrice',
    'priceINR',
    'priceUSD',
    'originalPriceINR',
    'originalPriceUSD',
    'originalPrice',
    'discount',
];

/**
 * Remove the admin's selling price from a product (and its variants) before it is
 * returned to a vendor. Mutates in place and returns the same object.
 *
 * Used on endpoints shared by admin and vendor, where a Prisma `select` whitelist would
 * starve the admin. Call ONLY on a vendor-bound response.
 */
function stripAdminPricing(product) {
    if (!product || typeof product !== 'object') return product;
    for (const field of ADMIN_PRICE_FIELDS) {
        delete product[field];
    }
    for (const variant of product.variants || []) {
        for (const field of ADMIN_PRICE_FIELDS) {
            delete variant[field];
        }
    }
    return product;
}

const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

/**
 * Attach the vendor's payout economics to a product they own — the GST they will be paid
 * on their own price and the resulting per-unit total. Replaces the MRP/discount fields
 * stripped above with numbers that are actually the vendor's to see.
 *
 * Mirrors the settlement math exactly (orderController + Settlement): GST is charged only
 * by GST-REGISTERED vendors, at the product's HSN rate. An unregistered vendor is paid
 * base only, so their tax is 0 even though the product still carries an HSN rate — the
 * `vendorGstRate` reflects what they're actually paid, not the bare HSN rate.
 *
 * Mutates in place (product + every variant) and returns the product.
 *
 * @param {object} product        Product with `basePrice`, `gstPercentage`, `variants[]`.
 * @param {boolean} vendorHasGstin Whether the owning vendor has a GSTIN.
 */
function attachVendorPayout(product, vendorHasGstin) {
    if (!product || typeof product !== 'object') return product;
    const hsnRate = product.gstPercentage || 0;
    const rate = vendorHasGstin ? hsnRate : 0;

    const payout = (unitPrice) => {
        const base = typeof unitPrice === 'number' && unitPrice > 0 ? unitPrice : 0;
        const tax = round2(base * rate / 100);
        return { gstRate: rate, taxAmount: tax, totalAmount: round2(base + tax) };
    };

    const p = payout(product.basePrice);
    product.vendorGstRate = p.gstRate;
    product.vendorTaxAmount = p.taxAmount;
    product.vendorTotalAmount = p.totalAmount;

    for (const variant of product.variants || []) {
        const v = payout(variant.price);
        variant.vendorGstRate = v.gstRate;
        variant.vendorTaxAmount = v.taxAmount;
        variant.vendorTotalAmount = v.totalAmount;
    }
    return product;
}

module.exports = {
    attachVendorPrices,
    stripAdminPricing,
    attachVendorPayout,
    SELLING_PRICE_FIELDS,
    ADMIN_PRICE_FIELDS,
};
