const { prisma } = require('../config/database');

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
const { notifications } = require('../utils/notificationService');

// Maps order status to notification helper
const STATUS_NOTIFICATION_MAP = {
  'ORDER_CONFIRMED': 'orderConfirmed',
  'PROCESSING': 'orderProcessing',
  'SHIPPED': 'orderShipped',
  'OUT_FOR_DELIVERY': 'orderOutForDelivery',
  'DELIVERED': 'orderDelivered',
  'CANCELLED': 'orderCancelled',
  'REFUNDED': 'orderRefunded',
};

const updateAdminOrderStatus = async (req, res) => {
    try {
        const adminId = req.userId || req.adminId;
        const { id } = req.params;
        const { status, assignedHubId } = req.body;

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

        const updatedOrder = await prisma.order.update({
            where: { id: order.id },
            data: {
                status: status || order.status,
                assignedHubId: assignedHubId || order.assignedHubId,
                statusHistory: {
                    create: {
                        status: status || order.status,
                        updatedBy: adminId,
                        updatedByType: "admin",
                        comment: assignedHubId ? `Admin assigned hub and updated status to ${status || order.status}` : `Admin updated status to ${status || order.status}`
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

        // Send push notification to customer (fire-and-forget)
        if (status && order.customerId) {
            const notifHelper = STATUS_NOTIFICATION_MAP[status];
            if (notifHelper && notifications[notifHelper]) {
                notifications[notifHelper](order.customerId, order.orderId).catch(() => {});
            }
        }

        res.json({
            success: true,
            data: updatedOrder
        });
    } catch (error) {
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
