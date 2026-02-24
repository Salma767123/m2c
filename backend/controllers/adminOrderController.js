const { prisma } = require('../config/database');

// Admin: Get all orders
const getAllOrdersAdmin = async (req, res) => {
    try {
        const orders = await prisma.order.findMany({
            include: {
                items: true,
                statusHistory: {
                    orderBy: { timestamp: 'desc' }
                }
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
                }
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
        const { status } = req.body;

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
                status: status,
                statusHistory: {
                    create: {
                        status: status,
                        updatedBy: adminId,
                        updatedByType: "admin",
                        comment: `Admin updated status to ${status}`
                    }
                }
            },
            include: {
                items: true,
                statusHistory: {
                    orderBy: { timestamp: 'desc' }
                }
            }
        });

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
