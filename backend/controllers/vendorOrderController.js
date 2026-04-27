const { prisma } = require('../config/database');
const { notifications } = require('../utils/notificationService');

// Maps vendor status → customer notification
const VENDOR_STATUS_NOTIFY = {
  'VENDOR_PROCESSING': 'orderProcessing',
  'PACKED_BY_VENDOR': null,                   // no customer notification for packing
  'IN_TRANSIT_TO_ADMIN_HUB': 'orderShipped',  // shipped from vendor
};

// Vendor: Get all orders containing items from this vendor
const getVendorOrders = async (req, res) => {
    try {
        const vendorId = req.vendorId || req.userId; // auth middleware sets one of these based on token

        // Find all orders that have at least one item from this vendor
        const orders = await prisma.order.findMany({
            where: {
                items: {
                    some: { vendorId: vendorId }
                }
            },
            include: {
                items: {
                    where: { vendorId: vendorId }
                },
                statusHistory: true,
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
        console.error('Get vendor orders error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch vendor orders'
        });
    }
};

// Vendor: Get single order by ID
const getVendorOrderById = async (req, res) => {
    try {
        const vendorId = req.vendorId || req.userId;
        const { id } = req.params;

        const isObjectId = /^[0-9a-fA-F]{24}$/.test(id);
        const whereClause = isObjectId ? { id } : { orderId: id };

        const order = await prisma.order.findUnique({
            where: whereClause,
            include: {
                items: {
                    where: { vendorId: vendorId }
                },
                statusHistory: true,
                hub: true
            }
        });

        if (!order || order.items.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Order not found or unauthorized'
            });
        }

        res.json({
            success: true,
            data: order
        });
    } catch (error) {
        console.error('Get vendor order error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch order details'
        });
    }
};

// Vendor: Update order status
const updateVendorOrderStatus = async (req, res) => {
    try {
        const vendorId = req.vendorId || req.userId;
        const { id } = req.params;
        const { status } = req.body;

        const validStatuses = ['VENDOR_PROCESSING', 'PACKED_BY_VENDOR', 'IN_TRANSIT_TO_ADMIN_HUB'];

        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid status update for vendor'
            });
        }

        const isObjectId = /^[0-9a-fA-F]{24}$/.test(id);
        const whereClause = isObjectId ? { id } : { orderId: id };

        const order = await prisma.order.findUnique({
            where: whereClause,
            include: {
                items: {
                    where: { vendorId: vendorId }
                }
            }
        });

        if (!order || order.items.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Order not found'
            });
        }

        // Restriction: Vendor cannot pack or ship without an assigned hub
        if (['PACKED_BY_VENDOR', 'IN_TRANSIT_TO_ADMIN_HUB'].includes(status) && !order.assignedHubId) {
            return res.status(403).json({
                success: false,
                error: 'Cannot pack or ship order until an admin assigns a hub to this order.'
            });
        }

        const updatedOrder = await prisma.order.update({
            where: { id: order.id },
            data: {
                status: status,
                statusHistory: {
                    create: {
                        status: status,
                        updatedBy: vendorId,
                        updatedByType: "vendor",
                        comment: `Vendor updated status to ${status}`
                    }
                }
            },
            include: {
                items: {
                    where: { vendorId: vendorId }
                },
                statusHistory: {
                    orderBy: { timestamp: 'desc' }
                },
                hub: true
            }
        });

        // Notify customer about status change (fire-and-forget)
        if (order.customerId) {
            const notifHelper = VENDOR_STATUS_NOTIFY[status];
            if (notifHelper && notifications[notifHelper]) {
                notifications[notifHelper](order.customerId, order.orderId).catch(() => {});
            }
        }

        res.json({
            success: true,
            data: updatedOrder
        });
    } catch (error) {
        console.error('Update vendor order status error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update order status'
        });
    }
};

module.exports = {
    getVendorOrders,
    getVendorOrderById,
    updateVendorOrderStatus
};
