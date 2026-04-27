const { prisma } = require('../config/database');
const { ACTIVE_ITEMS_FILTER } = require('../utils/activeItemsFilter');

// Recompute and persist the average rating + rating count for a vendor,
// based on every APPROVED admin review that carries a numeric rating.
// Only approved deliveries count toward the vendor's aggregate score.
// Safe to call multiple times; idempotent.
const recalculateVendorRating = async (tx, vendorId) => {
    if (!vendorId) return;
    const reviews = await tx.adminReview.findMany({
        where: { vendorId, rating: { not: null }, approved: true },
        select: { rating: true },
    });
    if (reviews.length === 0) {
        await tx.vendor.update({
            where: { id: vendorId },
            data: { rating: null, ratingCount: 0 },
        });
        return;
    }
    const sum = reviews.reduce((acc, r) => acc + (r.rating || 0), 0);
    const avg = Math.round((sum / reviews.length) * 10) / 10;
    await tx.vendor.update({
        where: { id: vendorId },
        data: { rating: avg, ratingCount: reviews.length },
    });
};

// ============================================
// SHIPMENT-BASED REVIEW (primary path for new orders)
// ============================================

// Admin: Create or update a review for a VendorShipment
const createOrUpdateShipmentReview = async (req, res) => {
    try {
        const adminId = req.userId || req.adminId;
        const { shipmentId } = req.params;
        const { reviewComments, qualityCheckNotes, rating, approved, rejectionReason, returnToVendor } = req.body;

        const shipment = await prisma.vendorShipment.findUnique({
            where: { id: shipmentId },
            include: { items: true },
        });

        if (!shipment) {
            return res.status(404).json({ success: false, message: 'Shipment not found' });
        }

        if (typeof approved !== 'boolean') {
            return res.status(400).json({ success: false, message: 'approved field (boolean) is required' });
        }

        if (!approved && (!rejectionReason || rejectionReason.trim() === '')) {
            return res.status(400).json({ success: false, message: 'Rejection reason is required when not approved' });
        }

        const parsedRating = rating ? parseInt(rating, 10) : null;
        if (parsedRating !== null && (Number.isNaN(parsedRating) || parsedRating < 1 || parsedRating > 5)) {
            return res.status(400).json({ success: false, message: 'Rating must be an integer between 1 and 5' });
        }

        const vendorId = shipment.vendorId;

        // Check existing review for this shipment
        const existingReview = await prisma.adminReview.findFirst({
            where: { shipmentId: shipment.id },
        });

        const result = await prisma.$transaction(async (tx) => {
            const basePayload = {
                reviewComments: reviewComments || null,
                qualityCheckNotes: qualityCheckNotes || null,
                rating: parsedRating,
                approved,
                rejectionReason: !approved ? (rejectionReason || null) : null,
                returnToVendor: returnToVendor || false,
                reviewedBy: adminId,
                reviewedAt: new Date(),
                vendorId: vendorId || null,
            };

            let review;
            if (existingReview) {
                review = await tx.adminReview.update({
                    where: { id: existingReview.id },
                    data: basePayload,
                });
            } else {
                review = await tx.adminReview.create({
                    data: {
                        shipmentId: shipment.id,
                        orderId: shipment.orderId,
                        ...basePayload,
                    },
                });
            }

            // Recompute vendor aggregate rating
            const previousVendorId = existingReview ? existingReview.vendorId : null;
            const idsToRefresh = new Set();
            if (vendorId) idsToRefresh.add(vendorId);
            if (previousVendorId && previousVendorId !== vendorId) idsToRefresh.add(previousVendorId);
            for (const id of idsToRefresh) {
                await recalculateVendorRating(tx, id);
            }

            return review;
        });

        res.status(existingReview ? 200 : 201).json({
            success: true,
            data: result,
            message: existingReview ? 'Admin review updated successfully' : 'Admin review created successfully',
        });
    } catch (error) {
        console.error('Error creating/updating shipment review:', error);
        res.status(500).json({ success: false, message: 'Error creating/updating admin review', error: error.message });
    }
};

// Admin: Get review for a specific shipment
const getAdminReviewByShipment = async (req, res) => {
    try {
        const { shipmentId } = req.params;

        const review = await prisma.adminReview.findFirst({
            where: { shipmentId },
            include: {
                shipment: {
                    select: { id: true, shipmentId: true, vendorName: true, status: true },
                },
                order: {
                    include: { items: true },
                },
            },
        });

        if (!review) {
            return res.status(404).json({ success: false, message: 'No admin review found for this shipment' });
        }

        res.status(200).json({ success: true, data: review });
    } catch (error) {
        console.error('Error fetching shipment review:', error);
        res.status(500).json({ success: false, message: 'Error fetching admin review', error: error.message });
    }
};

// ============================================
// ORDER-BASED REVIEW (backward compat for old orders)
// ============================================

// Admin: Create or update a review for an order (legacy path)
const createOrUpdateAdminReview = async (req, res) => {
    try {
        const adminId = req.userId || req.adminId;
        const { orderId } = req.params;
        const { reviewComments, qualityCheckNotes, rating, approved, rejectionReason, returnToVendor } = req.body;

        const isObjectId = /^[0-9a-fA-F]{24}$/.test(orderId);
        const whereClause = isObjectId ? { id: orderId } : { orderId: orderId };

        const order = await prisma.order.findUnique({
            where: whereClause,
            include: { items: true, shipments: { select: { id: true, vendorId: true } } },
        });

        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        // Multi-vendor orders should use the shipment-based review endpoint
        const uniqueVendors = new Set((order.items || []).map(i => i.vendorId));
        if (uniqueVendors.size > 1) {
            return res.status(400).json({
                success: false,
                message: 'This order has multiple vendors. Use the shipment-based review endpoint (/admin-reviews/shipment/:shipmentId) instead.',
            });
        }

        if (typeof approved !== 'boolean') {
            return res.status(400).json({ success: false, message: 'approved field (boolean) is required' });
        }

        if (!approved && (!rejectionReason || rejectionReason.trim() === '')) {
            return res.status(400).json({ success: false, message: 'Rejection reason is required when not approved' });
        }

        const parsedRating = rating ? parseInt(rating, 10) : null;
        if (parsedRating !== null && (Number.isNaN(parsedRating) || parsedRating < 1 || parsedRating > 5)) {
            return res.status(400).json({ success: false, message: 'Rating must be an integer between 1 and 5' });
        }

        const vendorId = order.items?.[0]?.vendorId || null;

        // For legacy: find by orderId (there may be multiple now, take first)
        const existingReview = await prisma.adminReview.findFirst({
            where: { orderId: order.id },
        });

        const result = await prisma.$transaction(async (tx) => {
            const basePayload = {
                reviewComments: reviewComments || null,
                qualityCheckNotes: qualityCheckNotes || null,
                rating: parsedRating,
                approved,
                rejectionReason: !approved ? (rejectionReason || null) : null,
                returnToVendor: returnToVendor || false,
                reviewedBy: adminId,
                reviewedAt: new Date(),
                vendorId: vendorId || null,
            };

            let review;
            if (existingReview) {
                review = await tx.adminReview.update({
                    where: { id: existingReview.id },
                    data: basePayload,
                });
            } else {
                review = await tx.adminReview.create({
                    data: { orderId: order.id, ...basePayload },
                });
            }

            const previousVendorId = existingReview ? existingReview.vendorId : null;
            const idsToRefresh = new Set();
            if (vendorId) idsToRefresh.add(vendorId);
            if (previousVendorId && previousVendorId !== vendorId) idsToRefresh.add(previousVendorId);
            for (const id of idsToRefresh) {
                await recalculateVendorRating(tx, id);
            }

            return review;
        });

        res.status(existingReview ? 200 : 201).json({
            success: true,
            data: result,
            message: existingReview ? 'Admin review updated successfully' : 'Admin review created successfully',
        });
    } catch (error) {
        console.error('Error creating/updating admin review:', error);
        res.status(500).json({ success: false, message: 'Error creating/updating admin review', error: error.message });
    }
};

// Admin: Get all admin reviews (with order and item details)
const getAllAdminReviews = async (req, res) => {
    try {
        const { search, status, page = 1, limit = 50, vendorId } = req.query;
        const skip = (Number(page) - 1) * Number(limit);

        const where = {};

        if (vendorId) {
            where.vendorId = vendorId;
        }

        if (status && status !== 'all') {
            if (status === 'approved') {
                where.approved = true;
            } else if (status === 'rejected') {
                where.approved = false;
            }
        }

        if (search) {
            where.OR = [
                { reviewComments: { contains: search, mode: 'insensitive' } },
                { qualityCheckNotes: { contains: search, mode: 'insensitive' } },
                { order: { orderId: { contains: search, mode: 'insensitive' } } },
                { order: { customerName: { contains: search, mode: 'insensitive' } } },
                {
                    order: {
                        items: {
                            some: {
                                OR: [
                                    { productName: { contains: search, mode: 'insensitive' } },
                                    { vendorName: { contains: search, mode: 'insensitive' } },
                                    { sku: { contains: search, mode: 'insensitive' } },
                                ],
                            },
                        },
                    },
                },
            ];
        }

        const [reviews, totalCount, approvedCount, rejectedCount] = await Promise.all([
            prisma.adminReview.findMany({
                where,
                include: {
                    order: {
                        include: {
                            items: ACTIVE_ITEMS_FILTER,
                        },
                    },
                    shipment: {
                        select: { id: true, shipmentId: true, vendorName: true, status: true },
                    },
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: Number(limit),
            }),
            prisma.adminReview.count({ where }),
            prisma.adminReview.count({ where: { ...where, approved: true } }),
            prisma.adminReview.count({ where: { ...where, approved: false } }),
        ]);

        let ratingDistribution;
        if (vendorId) {
            const distCounts = await Promise.all(
                [1, 2, 3, 4, 5].map((star) =>
                    prisma.adminReview.count({
                        where: { vendorId, rating: star, approved: true },
                    })
                )
            );
            ratingDistribution = { 1: distCounts[0], 2: distCounts[1], 3: distCounts[2], 4: distCounts[3], 5: distCounts[4] };
        }

        res.status(200).json({
            success: true,
            data: reviews,
            pagination: {
                total: totalCount,
                page: Number(page),
                limit: Number(limit),
                totalPages: Math.ceil(totalCount / Number(limit)),
            },
            stats: {
                total: totalCount,
                approved: approvedCount,
                rejected: rejectedCount,
            },
            ...(ratingDistribution && { ratingDistribution }),
        });
    } catch (error) {
        console.error('Error fetching admin reviews:', error);
        res.status(500).json({ success: false, message: 'Error fetching admin reviews', error: error.message });
    }
};

// Admin: Get admin review for a specific order (returns array for multi-vendor)
const getAdminReviewByOrder = async (req, res) => {
    try {
        const { orderId } = req.params;

        const isObjectId = /^[0-9a-fA-F]{24}$/.test(orderId);
        const orderWhere = isObjectId ? { id: orderId } : { orderId: orderId };

        const order = await prisma.order.findUnique({ where: orderWhere });
        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        const reviews = await prisma.adminReview.findMany({
            where: { orderId: order.id },
            include: {
                order: { include: { items: true } },
                shipment: {
                    select: { id: true, shipmentId: true, vendorName: true, status: true },
                },
            },
        });

        if (reviews.length === 0) {
            return res.status(404).json({ success: false, message: 'No admin review found for this order' });
        }

        // Return first for backward compat (single-vendor orders), full array in `reviews` field
        res.status(200).json({ success: true, data: reviews[0], reviews });
    } catch (error) {
        console.error('Error fetching admin review:', error);
        res.status(500).json({ success: false, message: 'Error fetching admin review', error: error.message });
    }
};

// Admin: Delete an admin review
const deleteAdminReview = async (req, res) => {
    try {
        const { id } = req.params;

        await prisma.$transaction(async (tx) => {
            const review = await tx.adminReview.findUnique({ where: { id } });
            if (!review) {
                throw Object.assign(new Error('Admin review not found'), { statusCode: 404 });
            }
            await tx.adminReview.delete({ where: { id } });
            if (review.vendorId) {
                await recalculateVendorRating(tx, review.vendorId);
            }
        });

        res.status(200).json({ success: true, message: 'Admin review deleted successfully' });
    } catch (error) {
        if (error.statusCode === 404) {
            return res.status(404).json({ success: false, message: error.message });
        }
        console.error('Error deleting admin review:', error);
        res.status(500).json({ success: false, message: 'Error deleting admin review', error: error.message });
    }
};

module.exports = {
    createOrUpdateShipmentReview,
    getAdminReviewByShipment,
    createOrUpdateAdminReview,
    getAllAdminReviews,
    getAdminReviewByOrder,
    deleteAdminReview,
};
