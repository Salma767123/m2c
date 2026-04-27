/**
 * Computes the aggregate Order-level status from all its VendorShipment statuses.
 *
 * Rule: the Order status equals the status of the **least progressed**
 * non-cancelled, non-returned shipment. This ensures the order doesn't
 * appear further along than every vendor has actually reached.
 *
 * Special cases:
 *  - All shipments CANCELLED  -> Order CANCELLED
 *  - All shipments RETURNED   -> Order RETURNED
 *  - All shipments DELIVERED  -> Order DELIVERED
 *  - Mix of terminal + active -> use least-progressed active shipment
 */

const STATUS_WEIGHT = {
    ORDER_CREATED: 0,
    VENDOR_PROCESSING: 1,
    PACKED_BY_VENDOR: 2,
    IN_TRANSIT_TO_ADMIN_HUB: 3,
    RECEIVED_AT_ADMIN_HUB: 4,
    APPROVED_BY_ADMIN_HUB: 5,
    REJECTED_BY_ADMIN_HUB: 5, // same tier as approved — needs resolution
    SHIPPED_TO_CUSTOMER: 6,
    DELIVERED: 7,
    CANCELLED: -1,
    RETURNED: -2,
};

function computeOrderStatus(shipmentStatuses) {
    if (!shipmentStatuses || shipmentStatuses.length === 0) {
        return 'ORDER_CREATED';
    }

    // Partition into terminal and active
    const active = [];
    let cancelledCount = 0;
    let returnedCount = 0;
    let deliveredCount = 0;

    for (const s of shipmentStatuses) {
        if (s === 'CANCELLED') {
            cancelledCount++;
        } else if (s === 'RETURNED') {
            returnedCount++;
        } else if (s === 'DELIVERED') {
            deliveredCount++;
        } else {
            active.push(s);
        }
    }

    const total = shipmentStatuses.length;

    // All terminal
    if (cancelledCount === total) return 'CANCELLED';
    if (returnedCount === total) return 'RETURNED';
    if (deliveredCount === total) return 'DELIVERED';
    // All delivered + some cancelled/returned (no active) — still delivered
    if (active.length === 0 && deliveredCount > 0) return 'DELIVERED';
    // Mix of terminal with no active — RETURNED takes priority over CANCELLED
    // (a return means goods were actually shipped, which is more significant)
    if (active.length === 0 && returnedCount > 0) return 'RETURNED';
    if (active.length === 0) return 'CANCELLED';

    // Find the least-progressed active shipment
    let minWeight = Infinity;
    let minStatus = 'ORDER_CREATED';
    let hasRejected = false;

    for (const s of active) {
        const w = STATUS_WEIGHT[s] ?? 0;
        if (s === 'REJECTED_BY_ADMIN_HUB') hasRejected = true;
        if (w < minWeight) {
            minWeight = w;
            minStatus = s;
        }
    }

    // If any shipment is rejected and the minimum is at the approval tier,
    // the order shows as still at hub for admin resolution
    if (hasRejected && minWeight >= STATUS_WEIGHT.APPROVED_BY_ADMIN_HUB) {
        // Check if ALL active are either approved or rejected
        const allAtApprovalTier = active.every(
            s => s === 'APPROVED_BY_ADMIN_HUB' || s === 'REJECTED_BY_ADMIN_HUB'
        );
        if (allAtApprovalTier) {
            return 'RECEIVED_AT_ADMIN_HUB'; // needs resolution
        }
    }

    return minStatus;
}

/**
 * Recomputes the Order-level status from its shipments and persists the change.
 * Must be called inside a Prisma transaction after any shipment status update.
 *
 * @param {object} tx - Prisma transaction client
 * @param {string} orderId - The Order's id (ObjectId string)
 * @returns {object} The updated Order
 */
async function recomputeAndPersistOrderStatus(tx, orderId) {
    const shipments = await tx.vendorShipment.findMany({
        where: { orderId },
        select: { status: true },
    });

    const currentOrder = await tx.order.findUnique({
        where: { id: orderId },
        select: { status: true },
    });

    const newStatus = computeOrderStatus(shipments.map(s => s.status));

    // Only update if status actually changed
    if (currentOrder && currentOrder.status !== newStatus) {
        return tx.order.update({
            where: { id: orderId },
            data: {
                status: newStatus,
                statusHistory: {
                    create: {
                        status: newStatus,
                        updatedBy: null,
                        updatedByType: 'system',
                        comment: `Order status auto-computed to ${newStatus}`,
                    },
                },
            },
        });
    }

    return currentOrder;
}

module.exports = { computeOrderStatus, recomputeAndPersistOrderStatus };
