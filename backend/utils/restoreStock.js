/**
 * Restore inventory for an order's items — the exact inverse of the stock
 * decrement done at order placement (orderController.createOrder). Call this when
 * an order is CANCELLED so the units go back on sale instead of leaking.
 *
 * Mirrors the placement model:
 *   • variant items  → productVariant.stock += qty
 *   • base items     → inventory.baseStock  += qty   (when the product has an inventory row)
 *   • then recompute  product.totalStock = baseStock + Σ variant.stock, and inStock
 * Only products with trackInventory === true were ever decremented, so only those
 * are restored. Returns stock-change history rows for the caller to persist.
 *
 * Runs INSIDE the caller's transaction (`tx`) so the restock commits atomically
 * with the cancellation.
 *
 * @param {object} tx    Prisma transaction client
 * @param {object} order order with `items` included (productId, variantId, quantity)
 * @param {object} meta  { reason, changedBy, changedByType, changedByName }
 * @returns {Promise<Array>} stockChangeHistory rows (may be empty)
 */
async function restoreStockForOrder(tx, order, meta = {}) {
    const items = (order?.items || []).filter((it) => it && it.productId);
    if (!items.length) return [];

    // Aggregate per product: base-unit qty + per-variant qty.
    const perProduct = {};
    for (const it of items) {
        perProduct[it.productId] ||= { base: 0, variants: {} };
        if (it.variantId) {
            perProduct[it.productId].variants[it.variantId] =
                (perProduct[it.productId].variants[it.variantId] || 0) + it.quantity;
        } else {
            perProduct[it.productId].base += it.quantity;
        }
    }

    const historyRecords = [];

    for (const [productId, grp] of Object.entries(perProduct)) {
        const product = await tx.product.findUnique({
            where: { id: productId },
            include: { variants: true },
        });
        // Not found or inventory not tracked → never decremented, nothing to give back.
        if (!product || !product.trackInventory) continue;

        const totalQty = grp.base + Object.values(grp.variants).reduce((a, b) => a + b, 0);
        const inventoryItemId = product.inventoryItemId || null;

        // 1) Restore each variant's stock.
        for (const [variantId, qty] of Object.entries(grp.variants)) {
            await tx.productVariant.update({
                where: { id: variantId },
                data: { stock: { increment: qty } },
            }).catch(() => {});
        }

        // 2) Restore base inventory stock.
        if (grp.base > 0 && inventoryItemId) {
            await tx.inventory.update({
                where: { id: inventoryItemId },
                data: { baseStock: { increment: grp.base } },
            }).catch(() => {});
        }

        // 3) Recompute product.totalStock from source-of-truth values (same as placement).
        const fresh = await tx.product.findUnique({
            where: { id: productId },
            include: { variants: true },
        });
        const variantSum = fresh?.variants?.reduce((s, v) => s + v.stock, 0) || 0;

        let newTotalStock;
        if (inventoryItemId) {
            const inv = await tx.inventory.findUnique({ where: { id: inventoryItemId } });
            newTotalStock = (inv?.baseStock || 0) + variantSum;
            await tx.inventory.update({
                where: { id: inventoryItemId },
                data: { currentStock: newTotalStock },
            }).catch(() => {});
            historyRecords.push({
                inventoryId: inventoryItemId,
                previousStock: Math.max(0, newTotalStock - totalQty),
                newStock: newTotalStock,
                changeAmount: totalQty,
                reason: meta.reason || 'Order cancelled',
                changedBy: meta.changedBy || null,
                changedByType: meta.changedByType || 'system',
                changedByName: meta.changedByName || 'System',
            });
        } else if (fresh?.variants?.length) {
            newTotalStock = variantSum;
        } else {
            // No inventory row and no variants — bump the product's own totalStock.
            newTotalStock = (fresh?.totalStock || 0) + grp.base;
        }

        await tx.product.update({
            where: { id: productId },
            data: { totalStock: newTotalStock, inStock: newTotalStock > 0 },
        }).catch(() => {});
    }

    return historyRecords;
}

module.exports = { restoreStockForOrder };
