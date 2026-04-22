const { prisma } = require('../config/database');

// Allowed OrderStatus values (mirrors the Prisma enum).
const ALLOWED_ORDER_STATUSES = new Set([
    'ORDER_CREATED',
    'VENDOR_PROCESSING',
    'PACKED_BY_VENDOR',
    'IN_TRANSIT_TO_ADMIN_HUB',
    'RECEIVED_AT_ADMIN_HUB',
    'APPROVED_BY_ADMIN_HUB',
    'REJECTED_BY_ADMIN_HUB',
    'SHIPPED_TO_CUSTOMER',
    'DELIVERED',
    'CANCELLED',
    'RETURNED',
]);

// Terminal statuses — cannot be changed once entered.
const TERMINAL_STATUSES = new Set(['CANCELLED', 'RETURNED']);

// Legal forward transitions the admin endpoint will accept. Guards against
// accidental skips (e.g. ORDER_CREATED → DELIVERED) and replays. Cancel is
// permitted from any non-terminal state.
const ADMIN_TRANSITIONS = {
    ORDER_CREATED:           ['VENDOR_PROCESSING', 'CANCELLED'],
    VENDOR_PROCESSING:       ['PACKED_BY_VENDOR', 'CANCELLED'],
    PACKED_BY_VENDOR:        ['IN_TRANSIT_TO_ADMIN_HUB', 'CANCELLED'],
    IN_TRANSIT_TO_ADMIN_HUB: ['RECEIVED_AT_ADMIN_HUB', 'CANCELLED'],
    RECEIVED_AT_ADMIN_HUB:   ['APPROVED_BY_ADMIN_HUB', 'REJECTED_BY_ADMIN_HUB', 'CANCELLED'],
    APPROVED_BY_ADMIN_HUB:   ['SHIPPED_TO_CUSTOMER', 'CANCELLED'],
    REJECTED_BY_ADMIN_HUB:   ['CANCELLED'],
    SHIPPED_TO_CUSTOMER:     ['DELIVERED', 'RETURNED'],
    DELIVERED:               ['RETURNED'],
    CANCELLED:               [],
    RETURNED:                [],
};

// Admin: Get all orders
const getAllOrdersAdmin = async (req, res) => {
    try {
        const orders = await prisma.order.findMany({
            include: {
                items: true,
                statusHistory: {
                    orderBy: { timestamp: 'desc' }
                },
                hub: true
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        res.json({
            success: true,
            data: orders
        });
    } catch (error) {
        console.error('Get all orders error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch orders'
        });
    }
};

// Admin: Get single order by ID
const getAdminOrderById = async (req, res) => {
    try {
        const { id } = req.params;

        const isObjectId = /^[0-9a-fA-F]{24}$/.test(id);
        const whereClause = isObjectId ? { id } : { orderId: id };

        const order = await prisma.order.findUnique({
            where: whereClause,
            include: {
                items: true,
                statusHistory: {
                    orderBy: { timestamp: 'desc' }
                },
                hub: true
            }
        });

        if (!order) {
            return res.status(404).json({
                success: false,
                error: 'Order not found'
            });
        }

        res.json({
            success: true,
            data: order
        });
    } catch (error) {
        console.error('Get admin order error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch order details'
        });
    }
};

// Admin: Update order status
const updateAdminOrderStatus = async (req, res) => {
    try {
        const adminId = req.userId || req.adminId; // Depends on how admin auth middleware sets it
        const { id } = req.params;
        const { status, assignedHubId } = req.body;

        // Validate status payload: must be a known OrderStatus value.
        // (Treat missing/empty status as a no-op — still allows hub-only assignment updates.)
        if (status !== undefined && status !== null && status !== '') {
            if (typeof status !== 'string' || !ALLOWED_ORDER_STATUSES.has(status)) {
                return res.status(400).json({
                    success: false,
                    error: `Invalid status value. Must be one of: ${[...ALLOWED_ORDER_STATUSES].join(', ')}`
                });
            }
        }

        const isObjectId = /^[0-9a-fA-F]{24}$/.test(id);
        const whereClause = isObjectId ? { id } : { orderId: id };

        const order = await prisma.order.findUnique({
            where: whereClause,
            include: {
                items: true
            }
        });

        if (!order) {
            return res.status(404).json({
                success: false,
                error: 'Order not found'
            });
        }

        // Transition guard: ensure the requested move is legal from the order's current status.
        if (status && status !== order.status) {
            if (TERMINAL_STATUSES.has(order.status)) {
                return res.status(409).json({
                    success: false,
                    error: `Order is ${order.status}; no further status changes are allowed.`
                });
            }
            const allowedNext = ADMIN_TRANSITIONS[order.status] || [];
            if (!allowedNext.includes(status)) {
                return res.status(409).json({
                    success: false,
                    error: `Illegal status transition: ${order.status} → ${status}. Allowed next: ${allowedNext.length ? allowedNext.join(', ') : '(none)'}.`
                });
            }
        }

        // Hub assignment is only meaningful at the very start of the flow.
        if (assignedHubId && !['ORDER_CREATED', 'VENDOR_PROCESSING'].includes(order.status)) {
            return res.status(409).json({
                success: false,
                error: `Hub can only be assigned while the order is in ORDER_CREATED or VENDOR_PROCESSING (current: ${order.status}).`
            });
        }

        const nextStatus = status || order.status;
        const updatedOrder = await prisma.$transaction(async (tx) => {
            // Re-read inside the transaction to guard against concurrent mutations.
            const fresh = await tx.order.findUnique({
                where: { id: order.id },
                select: { status: true },
            });
            if (!fresh || fresh.status !== order.status) {
                throw new Error('CONFLICT');
            }

            return tx.order.update({
                where: { id: order.id },
                data: {
                    status: nextStatus,
                    assignedHubId: assignedHubId ?? order.assignedHubId,
                    statusHistory: {
                        create: {
                            status: nextStatus,
                            updatedBy: adminId,
                            updatedByType: "admin",
                            comment: assignedHubId
                                ? `Admin assigned hub and updated status to ${nextStatus}`
                                : `Admin updated status to ${nextStatus}`
                        }
                    }
                },
                include: {
                    items: true,
                    statusHistory: {
                        orderBy: { timestamp: 'desc' }
                    },
                    hub: true
                }
            });
        });

        res.json({
            success: true,
            data: updatedOrder
        });
    } catch (error) {
        if (error.message === 'CONFLICT') {
            return res.status(409).json({
                success: false,
                error: 'Order status was modified by another admin. Please refresh and try again.'
            });
        }
        console.error('Update admin order status error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update order status'
        });
    }
};

module.exports = {
    getAllOrdersAdmin,
    getAdminOrderById,
    updateAdminOrderStatus
};
