/**
 * Prisma include-filter for order items: excludes items belonging to
 * CANCELLED or RETURNED vendor shipments (e.g. after a reship).
 *
 * Usage:  include: { items: ACTIVE_ITEMS_FILTER }
 */
const ACTIVE_ITEMS_FILTER = {
    where: {
        OR: [
            { shipmentId: null },
            { shipment: { status: { notIn: ['CANCELLED', 'RETURNED'] } } },
        ],
    },
};

module.exports = { ACTIVE_ITEMS_FILTER };
