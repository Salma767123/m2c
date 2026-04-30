const { prisma } = require('../config/database');
const { recomputeAndPersistOrderStatus } = require('../utils/computeOrderStatus');
const { notifications } = require('../utils/notificationService');

// Maps vendor status → customer notification
const VENDOR_STATUS_NOTIFY = {
  'VENDOR_PROCESSING': 'orderProcessing',
  'PACKED_BY_VENDOR': null,
  'IN_TRANSIT_TO_ADMIN_HUB': null,  // shipped to admin hub, not to customer yet
};

// Shared include for shipment queries — keeps response shape consistent.
const SHIPMENT_INCLUDE = {
    items: true,
    order: {
        select: {
            id: true,
            orderId: true,
            customerName: true,
            totalAmount: true,
            paymentStatus: true,
            paymentMethod: true,
            createdAt: true,
            orderDate: true,
            shippingAddress: true,
            customerEmail: true,
            customerPhone: true,
            subtotal: true,
            shippingCost: true,
            tax: true,
            discount: true,
            bagTypeName: true,
            bagTypePrice: true,
            paymentId: true,
            invoiceNo: true,
        },
    },
    hub: true,
    statusHistory: { orderBy: { timestamp: 'desc' } },
    adminReviews: {
        take: 1,
        select: {
            rating: true,
            reviewComments: true,
            qualityCheckNotes: true,
            approved: true,
            rejectionReason: true,
            returnToVendor: true,
            reviewedAt: true,
        },
    },
};

/**
 * Helper: Flatten the adminReviews array (1:many in schema, logically 1:1)
 * into a single `adminReview` field on the response object.
 */
function normalizeShipment(shipment) {
    if (!shipment) return shipment;
    const { adminReviews, ...rest } = shipment;
    return { ...rest, adminReview: adminReviews?.[0] || null };
}

// Vendor: Get all shipments for this vendor
const getVendorOrders = async (req, res) => {
    try {
        const vendorId = req.vendorId || req.userId;

        const shipments = await prisma.vendorShipment.findMany({
            where: { vendorId },
            include: SHIPMENT_INCLUDE,
            orderBy: { createdAt: 'desc' },
        });

        res.json({
            success: true,
            data: shipments.map(normalizeShipment),
        });
    } catch (error) {
        console.error('Get vendor orders error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch vendor orders',
        });
    }
};

// Vendor: Get single shipment by ID (supports ObjectId, shipmentId, or orderId)
const getVendorOrderById = async (req, res) => {
    try {
        const vendorId = req.vendorId || req.userId;
        const { id } = req.params;

        const isObjectId = /^[0-9a-fA-F]{24}$/.test(id);

        let shipment;

        if (isObjectId) {
            // Try as VendorShipment id first
            shipment = await prisma.vendorShipment.findFirst({
                where: { id, vendorId },
                include: SHIPMENT_INCLUDE,
            });
        }

        // Fallback: try as shipmentId string
        if (!shipment) {
            shipment = await prisma.vendorShipment.findFirst({
                where: { shipmentId: id, vendorId },
                include: SHIPMENT_INCLUDE,
            });
        }

        // Fallback: try as orderId (human-readable) — find this vendor's latest shipment for that order
        if (!shipment) {
            const order = await prisma.order.findUnique({
                where: { orderId: id },
                select: { id: true },
            });
            if (order) {
                shipment = await prisma.vendorShipment.findFirst({
                    where: { orderId: order.id, vendorId },
                    include: SHIPMENT_INCLUDE,
                    orderBy: { createdAt: 'desc' },
                });
            }
        }

        if (!shipment) {
            return res.status(404).json({
                success: false,
                error: 'Order not found or unauthorized',
            });
        }

        res.json({
            success: true,
            data: normalizeShipment(shipment),
        });
    } catch (error) {
        console.error('Get vendor order error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch order details',
        });
    }
};

// Vendor: Update shipment status
const updateVendorOrderStatus = async (req, res) => {
    try {
        const vendorId = req.vendorId || req.userId;
        const { id } = req.params;
        const { status, carrier, trackingId } = req.body;

        const validStatuses = ['VENDOR_PROCESSING', 'PACKED_BY_VENDOR', 'IN_TRANSIT_TO_ADMIN_HUB'];

        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid status update for vendor',
            });
        }

        // Shipping details required for IN_TRANSIT_TO_ADMIN_HUB
        const trimmedCarrier = typeof carrier === 'string' ? carrier.trim() : '';
        const trimmedTrackingId = typeof trackingId === 'string' ? trackingId.trim() : '';
        if (status === 'IN_TRANSIT_TO_ADMIN_HUB') {
            if (!trimmedCarrier || !trimmedTrackingId) {
                return res.status(400).json({
                    success: false,
                    error: 'Carrier and tracking ID are required to ship this order.',
                });
            }
            if (trimmedCarrier.length > 60 || trimmedTrackingId.length > 60) {
                return res.status(400).json({
                    success: false,
                    error: 'Carrier and tracking ID must be 60 characters or less.',
                });
            }
        }

        // Find the shipment — supports ObjectId, shipmentId string, or orderId
        const isObjectId = /^[0-9a-fA-F]{24}$/.test(id);
        let shipment;

        if (isObjectId) {
            shipment = await prisma.vendorShipment.findFirst({
                where: { id, vendorId },
                include: { items: true },
            });
        }
        if (!shipment) {
            shipment = await prisma.vendorShipment.findFirst({
                where: { shipmentId: id, vendorId },
                include: { items: true },
            });
        }
        if (!shipment) {
            const order = await prisma.order.findUnique({
                where: { orderId: id },
                select: { id: true },
            });
            if (order) {
                shipment = await prisma.vendorShipment.findFirst({
                    where: { orderId: order.id, vendorId },
                    include: { items: true },
                });
            }
        }

        if (!shipment) {
            return res.status(404).json({
                success: false,
                error: 'Order not found',
            });
        }

        // Vendor cannot pack or ship without an assigned hub
        if (['PACKED_BY_VENDOR', 'IN_TRANSIT_TO_ADMIN_HUB'].includes(status) && !shipment.assignedHubId) {
            return res.status(403).json({
                success: false,
                error: 'Cannot pack or ship order until an admin assigns a hub to this order.',
            });
        }

        const updateData = {
            status,
            statusHistory: {
                create: {
                    status,
                    updatedBy: vendorId,
                    updatedByType: 'vendor',
                    comment: status === 'IN_TRANSIT_TO_ADMIN_HUB'
                        ? `Vendor shipped via ${trimmedCarrier} (${trimmedTrackingId})`
                        : `Vendor updated status to ${status}`,
                },
            },
        };
        if (status === 'IN_TRANSIT_TO_ADMIN_HUB') {
            updateData.vendorCarrier = trimmedCarrier;
            updateData.vendorTrackingId = trimmedTrackingId;
            updateData.vendorShippedAt = new Date();
        }

        const updatedShipment = await prisma.$transaction(async (tx) => {
            const updated = await tx.vendorShipment.update({
                where: { id: shipment.id },
                data: updateData,
                include: SHIPMENT_INCLUDE,
            });

            // Recompute parent Order status
            await recomputeAndPersistOrderStatus(tx, shipment.orderId);

            return updated;
        });

        // Notify customer about status change (fire-and-forget)
        if (updatedShipment.order?.customerId) {
            const notifHelper = VENDOR_STATUS_NOTIFY[status];
            if (notifHelper && notifications[notifHelper]) {
                notifications[notifHelper](updatedShipment.order.customerId, updatedShipment.order.orderId).catch(() => {});
            }
        }

        res.json({
            success: true,
            data: normalizeShipment(updatedShipment),
        });
    } catch (error) {
        console.error('Update vendor order status error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update order status',
        });
    }
};

// Vendor: Get all admin reviews + rating summary for the current vendor
const getVendorReviews = async (req, res) => {
    try {
        const vendorId = req.vendorId || req.userId;
        const page = Math.max(1, parseInt(req.query.page, 10) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
        const skip = (page - 1) * limit;

        const reviewWhere = { vendorId };

        const [vendor, reviews, totalReviews, ratingRows] = await Promise.all([
            prisma.vendor.findUnique({
                where: { id: vendorId },
                select: { rating: true, ratingCount: true, companyName: true },
            }),
            prisma.adminReview.findMany({
                where: reviewWhere,
                orderBy: { reviewedAt: 'desc' },
                skip,
                take: limit,
                select: {
                    id: true,
                    rating: true,
                    reviewComments: true,
                    qualityCheckNotes: true,
                    approved: true,
                    rejectionReason: true,
                    returnToVendor: true,
                    reviewedAt: true,
                    createdAt: true,
                    shipment: {
                        select: {
                            id: true,
                            shipmentId: true,
                            status: true,
                        },
                    },
                    order: {
                        select: {
                            id: true,
                            orderId: true,
                            status: true,
                            totalAmount: true,
                            items: {
                                where: { vendorId },
                                select: {
                                    productName: true,
                                    sku: true,
                                    quantity: true,
                                },
                            },
                        },
                    },
                },
            }),
            prisma.adminReview.count({ where: reviewWhere }),
            prisma.adminReview.findMany({
                where: { vendorId, rating: { not: null } },
                select: { rating: true },
            }),
        ]);

        if (!vendor) {
            return res.status(404).json({ success: false, error: 'Vendor not found' });
        }

        const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        for (const r of ratingRows) {
            if (r.rating >= 1 && r.rating <= 5) distribution[r.rating] += 1;
        }

        res.json({
            success: true,
            data: {
                overall: {
                    rating: vendor.rating,
                    ratingCount: vendor.ratingCount,
                    totalReviews,
                    distribution,
                },
                reviews,
            },
            pagination: {
                page,
                limit,
                total: totalReviews,
                totalPages: Math.ceil(totalReviews / limit),
            },
        });
    } catch (error) {
        console.error('Get vendor reviews error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch reviews' });
    }
};

// Vendor: Reship a rejected shipment — creates a NEW shipment under the same order
const reshipVendorOrder = async (req, res) => {
    try {
        const vendorId = req.vendorId || req.userId;
        const { id } = req.params;

        // Find the rejected shipment
        const isObjectId = /^[0-9a-fA-F]{24}$/.test(id);
        let shipment;

        if (isObjectId) {
            shipment = await prisma.vendorShipment.findFirst({
                where: { id, vendorId },
                include: { items: true, order: { select: { id: true, orderId: true } } },
            });
        }
        if (!shipment) {
            shipment = await prisma.vendorShipment.findFirst({
                where: { shipmentId: id, vendorId },
                include: { items: true, order: { select: { id: true, orderId: true } } },
            });
        }

        if (!shipment) {
            return res.status(404).json({ success: false, error: 'Shipment not found' });
        }

        if (shipment.status !== 'REJECTED_BY_ADMIN_HUB') {
            return res.status(400).json({
                success: false,
                error: 'Only rejected shipments can be reshipped',
            });
        }

        // Create new shipment + cancel old one in a transaction
        // The duplicate check is inside the transaction to prevent race conditions
        const newShipment = await prisma.$transaction(async (tx) => {
            // Re-check no active reship exists (inside tx to prevent concurrent duplicates)
            const existingReship = await tx.vendorShipment.findFirst({
                where: {
                    orderId: shipment.orderId,
                    vendorId,
                    status: { notIn: ['CANCELLED', 'RETURNED', 'REJECTED_BY_ADMIN_HUB'] },
                },
            });
            if (existingReship) {
                throw new Error('DUPLICATE_RESHIP');
            }

            // Generate new shipment ID: ORD-YYYY-XXXXXXXXX-R{attempt}
            const existingCount = await tx.vendorShipment.count({
                where: { orderId: shipment.orderId, vendorId },
            });
            const baseOrderId = shipment.order.orderId;
            const newShipmentId = `${baseOrderId}-R${existingCount}`;

            // Mark old shipment as CANCELLED with history
            await tx.vendorShipment.update({
                where: { id: shipment.id },
                data: {
                    status: 'CANCELLED',
                    statusHistory: {
                        create: {
                            status: 'CANCELLED',
                            updatedBy: vendorId,
                            updatedByType: 'vendor',
                            comment: `Cancelled for reship — replaced by ${newShipmentId}`,
                        },
                    },
                },
            });

            // Create new shipment with copied items
            const created = await tx.vendorShipment.create({
                data: {
                    shipmentId: newShipmentId,
                    orderId: shipment.orderId,
                    vendorId,
                    vendorName: shipment.vendorName,
                    status: 'ORDER_CREATED',
                    assignedHubId: shipment.assignedHubId,
                    items: {
                        create: shipment.items.map(item => ({
                            orderId: shipment.orderId,
                            productId: item.productId,
                            vendorId: item.vendorId,
                            vendorName: item.vendorName,
                            productName: item.productName,
                            productImage: item.productImage,
                            sku: item.sku,
                            variantId: item.variantId || undefined,
                            size: item.size || undefined,
                            color: item.color || undefined,
                            quantity: item.quantity,
                            unitPrice: item.unitPrice,
                            totalPrice: item.totalPrice,
                        })),
                    },
                    statusHistory: {
                        create: {
                            status: 'ORDER_CREATED',
                            updatedBy: vendorId,
                            updatedByType: 'vendor',
                            comment: `Reship created — replacing rejected shipment ${shipment.shipmentId}`,
                        },
                    },
                },
                include: SHIPMENT_INCLUDE,
            });

            // Recompute parent order status
            await recomputeAndPersistOrderStatus(tx, shipment.orderId);

            return created;
        });

        res.json({
            success: true,
            data: normalizeShipment(newShipment),
            message: 'Reship created successfully. Pack and ship the replacement.',
        });
    } catch (error) {
        if (error.message === 'DUPLICATE_RESHIP') {
            return res.status(400).json({
                success: false,
                error: 'An active shipment already exists for this order. Cancel it first before reshipping.',
            });
        }
        console.error('Reship vendor order error:', error);
        res.status(500).json({ success: false, error: 'Failed to create reship' });
    }
};

module.exports = {
    getVendorOrders,
    getVendorOrderById,
    updateVendorOrderStatus,
    getVendorReviews,
    reshipVendorOrder,
};
