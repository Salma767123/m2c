const { prisma } = require('../config/database');

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
                hub: true,
                // Surface admin hub feedback to the vendor once the review has been
                // submitted. We pick only the fields a vendor should see — reviewedBy
                // (admin user id) and internal timestamps stay out.
                adminReview: {
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
        const { status, carrier, trackingId } = req.body;

        const validStatuses = ['VENDOR_PROCESSING', 'PACKED_BY_VENDOR', 'IN_TRANSIT_TO_ADMIN_HUB'];

        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid status update for vendor'
            });
        }

        // Shipping details are required when moving to IN_TRANSIT_TO_ADMIN_HUB.
        const trimmedCarrier = typeof carrier === 'string' ? carrier.trim() : '';
        const trimmedTrackingId = typeof trackingId === 'string' ? trackingId.trim() : '';
        if (status === 'IN_TRANSIT_TO_ADMIN_HUB') {
            if (!trimmedCarrier || !trimmedTrackingId) {
                return res.status(400).json({
                    success: false,
                    error: 'Carrier and tracking ID are required to ship this order.'
                });
            }
            if (trimmedCarrier.length > 60 || trimmedTrackingId.length > 60) {
                return res.status(400).json({
                    success: false,
                    error: 'Carrier and tracking ID must be 60 characters or less.'
                });
            }
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

        const updateData = {
            status: status,
            statusHistory: {
                create: {
                    status: status,
                    updatedBy: vendorId,
                    updatedByType: "vendor",
                    comment: status === 'IN_TRANSIT_TO_ADMIN_HUB'
                        ? `Vendor shipped via ${trimmedCarrier} (${trimmedTrackingId})`
                        : `Vendor updated status to ${status}`
                }
            }
        };
        if (status === 'IN_TRANSIT_TO_ADMIN_HUB') {
            updateData.vendorCarrier = trimmedCarrier;
            updateData.vendorTrackingId = trimmedTrackingId;
            updateData.vendorShippedAt = new Date();
        }

        const updatedOrder = await prisma.order.update({
            where: { id: order.id },
            data: updateData,
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
            // Lightweight full query for accurate histogram across all pages.
            prisma.adminReview.findMany({
                where: { vendorId, rating: { not: null } },
                select: { rating: true },
            }),
        ]);

        if (!vendor) {
            return res.status(404).json({ success: false, error: 'Vendor not found' });
        }

        // Distribution of ratings (how many 5-star, 4-star, etc.) for a histogram on the UI
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

module.exports = {
    getVendorOrders,
    getVendorOrderById,
    updateVendorOrderStatus,
    getVendorReviews,
};
