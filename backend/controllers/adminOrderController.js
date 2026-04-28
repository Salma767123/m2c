const { prisma } = require('../config/database');
const { recomputeAndPersistOrderStatus } = require('../utils/computeOrderStatus');
const { ACTIVE_ITEMS_FILTER } = require('../utils/activeItemsFilter');

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

// Legal forward transitions for shipment-level status updates.
const SHIPMENT_TRANSITIONS = {
    ORDER_CREATED:           ['VENDOR_PROCESSING', 'CANCELLED'],
    VENDOR_PROCESSING:       ['PACKED_BY_VENDOR', 'CANCELLED'],
    PACKED_BY_VENDOR:        ['IN_TRANSIT_TO_ADMIN_HUB', 'CANCELLED'],
    IN_TRANSIT_TO_ADMIN_HUB: ['RECEIVED_AT_ADMIN_HUB', 'CANCELLED'],
    RECEIVED_AT_ADMIN_HUB:   ['APPROVED_BY_ADMIN_HUB', 'REJECTED_BY_ADMIN_HUB', 'CANCELLED'],
    APPROVED_BY_ADMIN_HUB:   ['CANCELLED'],
    REJECTED_BY_ADMIN_HUB:   ['CANCELLED'],
    SHIPPED_TO_CUSTOMER:     [],
    DELIVERED:               [],
    CANCELLED:               [],
    RETURNED:                [],
};

// Legal forward transitions for order-level status (hub-to-customer phase).
const ORDER_TRANSITIONS = {
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

// ============================================
// SHIPMENT-LEVEL ENDPOINTS (Vendor-to-Hub flow)
// ============================================

// Admin: Get all shipments
const getAllShipmentsAdmin = async (req, res) => {
    try {
        const shipments = await prisma.vendorShipment.findMany({
            include: {
                items: true,
                order: {
                    select: {
                        id: true,
                        orderId: true,
                        customerName: true,
                        totalAmount: true,
                        paymentStatus: true,
                        createdAt: true,
                        orderDate: true,
                    },
                },
                hub: true,
                statusHistory: { orderBy: { timestamp: 'desc' } },
            },
            orderBy: { createdAt: 'desc' },
        });

        res.json({ success: true, data: shipments });
    } catch (error) {
        console.error('Get all shipments error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch shipments' });
    }
};

// Admin: Get single shipment by ID
const getShipmentByIdAdmin = async (req, res) => {
    try {
        const { id } = req.params;
        const isObjectId = /^[0-9a-fA-F]{24}$/.test(id);

        let shipment;
        if (isObjectId) {
            shipment = await prisma.vendorShipment.findUnique({
                where: { id },
                include: {
                    items: true,
                    order: {
                        select: {
                            id: true,
                            orderId: true,
                            customerName: true,
                            customerEmail: true,
                            customerPhone: true,
                            totalAmount: true,
                            subtotal: true,
                            shippingCost: true,
                            tax: true,
                            discount: true,
                            paymentStatus: true,
                            paymentMethod: true,
                            paymentId: true,
                            shippingAddress: true,
                            createdAt: true,
                            orderDate: true,
                            invoiceNo: true,
                            bagTypeName: true,
                            bagTypePrice: true,
                        },
                    },
                    hub: true,
                    statusHistory: { orderBy: { timestamp: 'desc' } },
                    adminReviews: { take: 1 },
                },
            });
        }

        if (!shipment) {
            shipment = await prisma.vendorShipment.findUnique({
                where: { shipmentId: id },
                include: {
                    items: true,
                    order: {
                        select: {
                            id: true,
                            orderId: true,
                            customerName: true,
                            customerEmail: true,
                            customerPhone: true,
                            totalAmount: true,
                            subtotal: true,
                            shippingCost: true,
                            tax: true,
                            discount: true,
                            paymentStatus: true,
                            paymentMethod: true,
                            paymentId: true,
                            shippingAddress: true,
                            createdAt: true,
                            orderDate: true,
                            invoiceNo: true,
                            bagTypeName: true,
                            bagTypePrice: true,
                        },
                    },
                    hub: true,
                    statusHistory: { orderBy: { timestamp: 'desc' } },
                    adminReviews: { take: 1 },
                },
            });
        }

        if (!shipment) {
            return res.status(404).json({ success: false, error: 'Shipment not found' });
        }

        // Flatten adminReviews[0] → adminReview
        const { adminReviews, ...rest } = shipment;
        res.json({ success: true, data: { ...rest, adminReview: adminReviews?.[0] || null } });
    } catch (error) {
        console.error('Get admin shipment error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch shipment details' });
    }
};

// Admin: Update shipment status (assign hub, mark received, etc.)
const updateShipmentStatusAdmin = async (req, res) => {
    try {
        const adminId = req.userId || req.adminId;
        const { id } = req.params;
        const { status, assignedHubId } = req.body;

        // Validate status
        if (status !== undefined && status !== null && status !== '') {
            if (typeof status !== 'string' || !ALLOWED_ORDER_STATUSES.has(status)) {
                return res.status(400).json({
                    success: false,
                    error: `Invalid status value. Must be one of: ${[...ALLOWED_ORDER_STATUSES].join(', ')}`,
                });
            }
        }

        const isObjectId = /^[0-9a-fA-F]{24}$/.test(id);
        let shipment;
        if (isObjectId) {
            shipment = await prisma.vendorShipment.findUnique({
                where: { id },
                include: { items: true },
            });
        }
        if (!shipment) {
            shipment = await prisma.vendorShipment.findUnique({
                where: { shipmentId: id },
                include: { items: true },
            });
        }

        if (!shipment) {
            return res.status(404).json({ success: false, error: 'Shipment not found' });
        }

        // Transition guard
        if (status && status !== shipment.status) {
            if (TERMINAL_STATUSES.has(shipment.status)) {
                return res.status(409).json({
                    success: false,
                    error: `Shipment is ${shipment.status}; no further status changes are allowed.`,
                });
            }
            const allowedNext = SHIPMENT_TRANSITIONS[shipment.status] || [];
            if (!allowedNext.includes(status)) {
                return res.status(409).json({
                    success: false,
                    error: `Illegal status transition: ${shipment.status} → ${status}. Allowed next: ${allowedNext.length ? allowedNext.join(', ') : '(none)'}.`,
                });
            }
        }

        // Hub assignment only allowed early in the flow
        if (assignedHubId && !['ORDER_CREATED', 'VENDOR_PROCESSING'].includes(shipment.status)) {
            return res.status(409).json({
                success: false,
                error: `Hub can only be assigned while the shipment is in ORDER_CREATED or VENDOR_PROCESSING (current: ${shipment.status}).`,
            });
        }

        const nextStatus = status || shipment.status;
        const updatedShipment = await prisma.$transaction(async (tx) => {
            // Optimistic locking
            const fresh = await tx.vendorShipment.findUnique({
                where: { id: shipment.id },
                select: { status: true },
            });
            if (!fresh || fresh.status !== shipment.status) {
                throw new Error('CONFLICT');
            }

            const updated = await tx.vendorShipment.update({
                where: { id: shipment.id },
                data: {
                    status: nextStatus,
                    assignedHubId: assignedHubId ?? shipment.assignedHubId,
                    statusHistory: {
                        create: {
                            status: nextStatus,
                            updatedBy: adminId,
                            updatedByType: 'admin',
                            comment: assignedHubId
                                ? `Admin assigned hub and updated status to ${nextStatus}`
                                : `Admin updated status to ${nextStatus}`,
                        },
                    },
                },
                include: {
                    items: true,
                    order: {
                        select: { id: true, orderId: true, customerName: true, totalAmount: true },
                    },
                    hub: true,
                    statusHistory: { orderBy: { timestamp: 'desc' } },
                },
            });

            // Recompute parent Order status
            await recomputeAndPersistOrderStatus(tx, shipment.orderId);

            return updated;
        });

        res.json({ success: true, data: updatedShipment });
    } catch (error) {
        if (error.message === 'CONFLICT') {
            return res.status(409).json({
                success: false,
                error: 'Shipment status was modified by another admin. Please refresh and try again.',
            });
        }
        console.error('Update admin shipment status error:', error);
        res.status(500).json({ success: false, error: 'Failed to update shipment status' });
    }
};

// ============================================
// ORDER-LEVEL ENDPOINTS (Hub-to-Customer flow + listing)
// ============================================

// Admin: Get all orders
const getAllOrdersAdmin = async (req, res) => {
    try {
        const orders = await prisma.order.findMany({
            include: {
                items: ACTIVE_ITEMS_FILTER,
                statusHistory: {
                    orderBy: { timestamp: 'desc' },
                },
                hub: true,
                shipments: {
                    include: {
                        items: true,
                        hub: true,
                        adminReviews: { take: 1 },
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });

        res.json({ success: true, data: orders });
    } catch (error) {
        console.error('Get all orders error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch orders' });
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
                items: ACTIVE_ITEMS_FILTER,
                statusHistory: {
                    orderBy: { timestamp: 'desc' },
                },
                hub: true,
                shipments: {
                    include: {
                        items: true,
                        hub: true,
                        statusHistory: { orderBy: { timestamp: 'desc' } },
                        adminReviews: { take: 1 },
                    },
                },
            },
        });

        if (!order) {
            return res.status(404).json({ success: false, error: 'Order not found' });
        }

        res.json({ success: true, data: order });
    } catch (error) {
        console.error('Get admin order error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch order details' });
    }
};

// Admin: Update order status (hub-to-customer phase)
const { notifications } = require('../utils/notificationService');

// Maps order status to notification helper — must match OrderStatus enum exactly
const STATUS_NOTIFICATION_MAP = {
  'ORDER_CREATED': 'orderConfirmed',
  'VENDOR_PROCESSING': 'orderProcessing',
  'PACKED_BY_VENDOR': null,
  'IN_TRANSIT_TO_ADMIN_HUB': null,
  'RECEIVED_AT_ADMIN_HUB': null,
  'APPROVED_BY_ADMIN_HUB': null,
  'SHIPPED_TO_CUSTOMER': 'orderShipped',
  'DELIVERED': 'orderDelivered',
  'CANCELLED': 'orderCancelled',
  'RETURNED': 'orderRefunded',
};


const updateAdminOrderStatus = async (req, res) => {
    try {
        const adminId = req.userId || req.adminId;
        const { id } = req.params;
        const { status } = req.body;

        if (status !== undefined && status !== null && status !== '') {
            if (typeof status !== 'string' || !ALLOWED_ORDER_STATUSES.has(status)) {
                return res.status(400).json({
                    success: false,
                    error: `Invalid status value. Must be one of: ${[...ALLOWED_ORDER_STATUSES].join(', ')}`,
                });
            }
        }

        const isObjectId = /^[0-9a-fA-F]{24}$/.test(id);
        const whereClause = isObjectId ? { id } : { orderId: id };

        const order = await prisma.order.findUnique({
            where: whereClause,
            include: {
                items: true,
                shipments: { select: { id: true, status: true } },
            },
        });

        if (!order) {
            return res.status(404).json({ success: false, error: 'Order not found' });
        }

        // Transition guard
        if (status && status !== order.status) {
            if (TERMINAL_STATUSES.has(order.status)) {
                return res.status(409).json({
                    success: false,
                    error: `Order is ${order.status}; no further status changes are allowed.`,
                });
            }
            const allowedNext = ORDER_TRANSITIONS[order.status] || [];
            if (!allowedNext.includes(status)) {
                return res.status(409).json({
                    success: false,
                    error: `Illegal status transition: ${order.status} → ${status}. Allowed next: ${allowedNext.length ? allowedNext.join(', ') : '(none)'}.`,
                });
            }
        }

        const nextStatus = status || order.status;
        const updatedOrder = await prisma.$transaction(async (tx) => {
            // Optimistic locking — re-read inside transaction
            const fresh = await tx.order.findUnique({
                where: { id: order.id },
                select: { status: true },
            });
            if (!fresh || fresh.status !== order.status) {
                throw new Error('CONFLICT');
            }

            // SHIPPED_TO_CUSTOMER requires all non-terminal shipments to be APPROVED.
            // Re-read shipments inside the transaction to prevent race conditions.
            if (nextStatus === 'SHIPPED_TO_CUSTOMER') {
                const freshShipments = await tx.vendorShipment.findMany({
                    where: { orderId: order.id },
                    select: { status: true },
                });
                if (freshShipments.length > 0) {
                    const pending = freshShipments.filter(
                        s => s.status !== 'APPROVED_BY_ADMIN_HUB'
                            && s.status !== 'CANCELLED'
                            && s.status !== 'RETURNED'
                    );
                    if (pending.length > 0) {
                        throw Object.assign(
                            new Error('Cannot ship to customer until all vendor shipments are approved (or cancelled/returned).'),
                            { statusCode: 409 }
                        );
                    }
                }
            }

            return tx.order.update({
                where: { id: order.id },
                data: {
                    status: nextStatus,
                    statusHistory: {
                        create: {
                            status: nextStatus,
                            updatedBy: adminId,
                            updatedByType: 'admin',
                            comment: `Admin updated status to ${nextStatus}`,
                        },
                    },
                },
                include: {
                    items: true,
                    statusHistory: { orderBy: { timestamp: 'desc' } },
                    hub: true,
                    shipments: {
                        include: {
                            items: true,
                            hub: true,
                            adminReviews: { take: 1 },
                        },
                    },
                },
            });
        });

        // Send push notification to customer (fire-and-forget)
        if (status && order.customerId) {
            const notifHelper = STATUS_NOTIFICATION_MAP[status];
            if (notifHelper && notifications[notifHelper]) {
                notifications[notifHelper](order.customerId, order.orderId).catch(() => {});
            }
        }

        res.json({ success: true, data: updatedOrder });
    } catch (error) {
        if (error.message === 'CONFLICT') {
            return res.status(409).json({
                success: false,
                error: 'Order status was modified by another admin. Please refresh and try again.',
            });
        }
        if (error.statusCode === 409) {
            return res.status(409).json({ success: false, error: error.message });
        }
        console.error('Update admin order status error:', error);
        res.status(500).json({ success: false, error: 'Failed to update order status' });
    }
};

module.exports = {
    getAllShipmentsAdmin,
    getShipmentByIdAdmin,
    updateShipmentStatusAdmin,
    getAllOrdersAdmin,
    getAdminOrderById,
    updateAdminOrderStatus,
};
