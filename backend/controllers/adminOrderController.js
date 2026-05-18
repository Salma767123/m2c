const { prisma } = require('../config/database');
const { recomputeAndPersistOrderStatus } = require('../utils/computeOrderStatus');
const { ACTIVE_ITEMS_FILTER } = require('../utils/activeItemsFilter');

const SETTLEMENT_DUE_DAYS = 30;

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

            // Settlement due date: triggered by shipment approval/rejection/cancellation
            if (status === 'APPROVED_BY_ADMIN_HUB') {
                const dueDate = new Date();
                dueDate.setDate(dueDate.getDate() + SETTLEMENT_DUE_DAYS);
                const dueDateResult = await tx.settlement.updateMany({
                    where: {
                        orderId: shipment.orderId,
                        vendorId: shipment.vendorId,
                        status: 'Pending',
                        dueDate: null,
                    },
                    data: { dueDate },
                });
                if (dueDateResult.count === 0) {
                    console.warn(`[Settlement] No pending settlements found for orderId=${shipment.orderId}, vendorId=${shipment.vendorId} — dueDate not set`);
                }
            } else if (status === 'REJECTED_BY_ADMIN_HUB') {
                await tx.settlement.updateMany({
                    where: {
                        orderId: shipment.orderId,
                        vendorId: shipment.vendorId,
                        status: 'Pending',
                    },
                    data: { status: 'Failed' },
                });
            } else if (status === 'CANCELLED') {
                await tx.settlement.updateMany({
                    where: {
                        orderId: shipment.orderId,
                        vendorId: shipment.vendorId,
                        status: { in: ['Pending', 'Processing'] },
                    },
                    data: { status: 'Cancelled' },
                });
            }

            return updated;
        });

        // Notify vendor about shipment status change
        if (status || assignedHubId) {
            const { createNotification: createShipmentNotif } = require('./notificationController');
            const vendorId = shipment.vendorId || shipment.items?.[0]?.vendorId;
            const orderId = updatedShipment.order?.orderId || '';

            const shipmentMessages = {
                'VENDOR_PROCESSING': assignedHubId
                    ? { title: 'Hub Assigned — Start Processing', message: `Order #${orderId} has been assigned to a hub. Please start processing.` }
                    : { title: 'Order Processing', message: `Order #${orderId} is now being processed.` },
                'IN_TRANSIT_TO_ADMIN_HUB': { title: 'Order In Transit', message: `Order #${orderId} is in transit to admin hub.` },
                'RECEIVED_AT_ADMIN_HUB': { title: 'Order Received at Hub', message: `Order #${orderId} has been received at admin hub.` },
                'APPROVED_BY_ADMIN_HUB': { title: 'Shipment Approved', message: `Your shipment for order #${orderId} has been approved by the hub.` },
                'SHIPPED_TO_CUSTOMER': { title: 'Order Shipped', message: `Order #${orderId} has been shipped to the customer.` },
                'DELIVERED': { title: 'Order Delivered', message: `Order #${orderId} has been delivered to the customer.` },
                'CANCELLED': { title: 'Order Cancelled', message: `Order #${orderId} has been cancelled.` },
                'RETURNED': { title: 'Order Returned', message: `Order #${orderId} has been returned.` },
            };

            const nextSt = status || (assignedHubId ? 'VENDOR_PROCESSING' : null);
            const msg = nextSt ? shipmentMessages[nextSt] : null;
            if (msg && vendorId) {
                createShipmentNotif({
                    userId: vendorId, role: 'VENDOR', type: `ORDER_${nextSt}`,
                    title: msg.title, message: msg.message,
                    data: { orderId: shipment.orderId, shipmentId: shipment.id }
                }).catch(() => {});
            }
        }

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

            // Cancel all pending settlements when order is cancelled
            if (nextStatus === 'CANCELLED') {
                await tx.settlement.updateMany({
                    where: {
                        orderId: order.id,
                        status: { in: ['Pending', 'Processing'] },
                    },
                    data: { status: 'Cancelled' },
                });
            }

            // Safety net: backfill dueDate on any Pending settlements that still
            // have dueDate === null. The primary trigger lives in
            // updateShipmentStatusAdmin (APPROVED_BY_ADMIN_HUB), but if it was
            // missed (old code, race, crash) we catch it here before the order
            // progresses past the point of no return.
            if (nextStatus === 'SHIPPED_TO_CUSTOMER' || nextStatus === 'DELIVERED') {
                const nullDueDateSettlements = await tx.settlement.findMany({
                    where: {
                        orderId: order.id,
                        status: 'Pending',
                        dueDate: null,
                    },
                    select: { id: true, vendorId: true },
                });

                if (nullDueDateSettlements.length > 0) {
                    console.warn(`[Settlement] Backfilling dueDate for ${nullDueDateSettlements.length} settlement(s) on order ${order.id} → ${nextStatus}`);
                    const approvedShipments = await tx.vendorShipment.findMany({
                        where: {
                            orderId: order.id,
                            status: { in: ['APPROVED_BY_ADMIN_HUB', 'DELIVERED'] },
                        },
                        select: { vendorId: true, updatedAt: true },
                    });

                    const vendorApprovalDate = {};
                    for (const s of approvedShipments) {
                        if (!vendorApprovalDate[s.vendorId] || s.updatedAt > vendorApprovalDate[s.vendorId]) {
                            vendorApprovalDate[s.vendorId] = s.updatedAt;
                        }
                    }

                    for (const settlement of nullDueDateSettlements) {
                        const baseDate = vendorApprovalDate[settlement.vendorId] || new Date();
                        const dueDate = new Date(baseDate);
                        dueDate.setDate(dueDate.getDate() + SETTLEMENT_DUE_DAYS);
                        await tx.settlement.update({
                            where: { id: settlement.id },
                            data: { dueDate },
                        });
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

        // In-app notifications for vendor on key order status changes
        if (status) {
            const { createNotification: createOrderNotif } = require('./notificationController');
            const vendorIds = [...new Set(order.items.map(i => i.vendorId).filter(Boolean))];
            const vendorStatusMessages = {
                'VENDOR_PROCESSING': { title: 'Hub Assigned — Start Processing', message: `Order #${order.orderId} has been assigned to a hub. Please start processing.` },
                'IN_TRANSIT_TO_ADMIN_HUB': { title: 'Order In Transit', message: `Order #${order.orderId} is in transit to admin hub.` },
                'RECEIVED_AT_ADMIN_HUB': { title: 'Order Received at Hub', message: `Order #${order.orderId} has been received at admin hub.` },
                'SHIPPED_TO_CUSTOMER': { title: 'Order Shipped to Customer', message: `Order #${order.orderId} has been shipped to the customer.` },
                'DELIVERED': { title: 'Order Delivered', message: `Order #${order.orderId} has been delivered to the customer.` },
                'CANCELLED': { title: 'Order Cancelled', message: `Order #${order.orderId} has been cancelled.` },
                'RETURNED': { title: 'Order Returned', message: `Order #${order.orderId} has been returned by the customer.` },
            };
            const vendorMsg = vendorStatusMessages[status];
            if (vendorMsg) {
                for (const vid of vendorIds) {
                    createOrderNotif({
                        userId: vid, role: 'VENDOR', type: `ORDER_${status}`,
                        title: vendorMsg.title, message: vendorMsg.message,
                        data: { orderId: order.id }
                    }).catch(() => {});
                }
            }

            // In-app notifications for customer on key order status changes
            if (order.customerId) {
                const customerStatusMessages = {
                    'SHIPPED_TO_CUSTOMER': { title: 'Order Shipped!', message: `Your order #${order.orderId} has been shipped and is on its way!` },
                    'DELIVERED': { title: 'Order Delivered', message: `Your order #${order.orderId} has been delivered. Enjoy your purchase!` },
                    'CANCELLED': { title: 'Order Cancelled', message: `Your order #${order.orderId} has been cancelled.` },
                    'RETURNED': { title: 'Refund Processed', message: `Your order #${order.orderId} has been returned and a refund will be processed.` },
                };
                const customerMsg = customerStatusMessages[status];
                if (customerMsg) {
                    createOrderNotif({
                        userId: order.customerId, role: 'USER', type: `ORDER_${status}`,
                        title: customerMsg.title, message: customerMsg.message,
                        data: { orderId: order.id }
                    }).catch(() => {});
                }
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
