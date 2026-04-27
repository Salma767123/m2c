/**
 * Migration script: backfill VendorShipment records for existing orders.
 *
 * For each existing Order that doesn't already have VendorShipments:
 *  1. Group OrderItems by vendorId
 *  2. Create one VendorShipment per vendor group
 *  3. Link each OrderItem to its VendorShipment via shipmentId
 *  4. If an AdminReview exists, link it to the matching VendorShipment
 *  5. Copy OrderStatusHistory entries to ShipmentStatusHistory
 *
 * Safe to run multiple times — skips orders that already have shipments.
 *
 * Usage: node backend/scripts/migrateToVendorShipments.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function migrate() {
    console.log('Starting VendorShipment migration...\n');

    const orders = await prisma.order.findMany({
        include: {
            items: true,
            shipments: { select: { id: true } },
            statusHistory: { orderBy: { timestamp: 'asc' } },
            adminReview: true, // Now returns array (1:many)
        },
    });

    let migratedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const order of orders) {
        // Skip orders that already have shipments
        if (order.shipments && order.shipments.length > 0) {
            skippedCount++;
            continue;
        }

        // Skip orders with no items
        if (!order.items || order.items.length === 0) {
            console.warn(`  WARN: Order ${order.orderId} has no items, skipping.`);
            skippedCount++;
            continue;
        }

        try {
            await prisma.$transaction(async (tx) => {
                // Group items by vendorId
                const vendorGroups = {};
                for (const item of order.items) {
                    const vid = item.vendorId;
                    if (!vendorGroups[vid]) {
                        vendorGroups[vid] = {
                            vendorName: item.vendorName,
                            items: [],
                        };
                    }
                    vendorGroups[vid].items.push(item);
                }

                let shipmentIdx = 0;
                for (const [vid, group] of Object.entries(vendorGroups)) {
                    shipmentIdx++;
                    const shipmentDisplayId = `${order.orderId}-V${shipmentIdx}`;

                    // Create VendorShipment with the order's current status, carrier, hub
                    const shipment = await tx.vendorShipment.create({
                        data: {
                            shipmentId: shipmentDisplayId,
                            orderId: order.id,
                            vendorId: vid,
                            vendorName: group.vendorName,
                            status: order.status,
                            vendorCarrier: order.vendorCarrier || null,
                            vendorTrackingId: order.vendorTrackingId || null,
                            vendorShippedAt: order.vendorShippedAt || null,
                            assignedHubId: order.assignedHubId || null,
                        },
                    });

                    // Link items to this shipment
                    const itemIds = group.items.map((i) => i.id);
                    await tx.orderItem.updateMany({
                        where: { id: { in: itemIds } },
                        data: { shipmentId: shipment.id },
                    });

                    // Link matching AdminReview(s) to this shipment
                    const reviews = order.adminReview || [];
                    for (const rev of reviews) {
                        if (rev.shipmentId) continue; // already linked
                        const reviewVendorId = rev.vendorId;
                        // Link to matching vendor, or to the first shipment if no vendorId on review
                        if (!reviewVendorId || reviewVendorId === vid) {
                            await tx.adminReview.update({
                                where: { id: rev.id },
                                data: { shipmentId: shipment.id },
                            });
                        }
                    }

                    // Copy only vendor-to-hub phase status history entries.
                    // Exclude order-level statuses (SHIPPED_TO_CUSTOMER, DELIVERED)
                    // to avoid polluting per-vendor shipment history with cross-vendor events.
                    const vendorPhaseStatuses = new Set([
                        'ORDER_CREATED', 'VENDOR_PROCESSING', 'PACKED_BY_VENDOR',
                        'IN_TRANSIT_TO_ADMIN_HUB', 'RECEIVED_AT_ADMIN_HUB',
                        'APPROVED_BY_ADMIN_HUB', 'REJECTED_BY_ADMIN_HUB', 'CANCELLED',
                    ]);
                    if (order.statusHistory && order.statusHistory.length > 0) {
                        const historyData = order.statusHistory
                            .filter((h) => vendorPhaseStatuses.has(h.status))
                            .map((h) => ({
                                shipmentId: shipment.id,
                                status: h.status,
                                comment: h.comment,
                                updatedBy: h.updatedBy,
                                updatedByType: h.updatedByType,
                                timestamp: h.timestamp,
                            }));
                        if (historyData.length > 0) {
                            await tx.shipmentStatusHistory.createMany({
                                data: historyData,
                            });
                        }
                    }
                }
            });

            migratedCount++;
            console.log(`  OK: ${order.orderId} → ${Object.keys(
                order.items.reduce((acc, i) => { acc[i.vendorId] = true; return acc; }, {})
            ).length} shipment(s)`);
        } catch (err) {
            errorCount++;
            console.error(`  ERROR: ${order.orderId}: ${err.message}`);
        }
    }

    console.log(`\nMigration complete.`);
    console.log(`  Migrated: ${migratedCount}`);
    console.log(`  Skipped (already migrated): ${skippedCount}`);
    console.log(`  Errors: ${errorCount}`);

    // Verification
    const totalShipments = await prisma.vendorShipment.count();
    const totalOrders = await prisma.order.count();
    const itemsWithoutShipment = await prisma.orderItem.count({
        where: { shipmentId: null },
    });

    console.log(`\nVerification:`);
    console.log(`  Total orders: ${totalOrders}`);
    console.log(`  Total shipments: ${totalShipments}`);
    console.log(`  Items without shipment: ${itemsWithoutShipment}`);

    if (itemsWithoutShipment > 0) {
        console.warn(`\n  WARNING: ${itemsWithoutShipment} OrderItem(s) still have no shipmentId.`);
    } else {
        console.log(`  All OrderItems linked to shipments.`);
    }
}

migrate()
    .catch((e) => {
        console.error('Migration failed:', e);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
