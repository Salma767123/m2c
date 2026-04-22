const { prisma } = require('../config/database');

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
    // Round to 1 decimal place for clean display (e.g., 4.5).
    const avg = Math.round((sum / reviews.length) * 10) / 10;
    await tx.vendor.update({
        where: { id: vendorId },
        data: { rating: avg, ratingCount: reviews.length },
    });
};

// Best-effort lookup of the primary vendor for an order. Vendor-to-hub orders
// are single-vendor by construction, so we take the first item's vendorId.
const resolveOrderVendorId = (order) => {
    if (!order || !order.items || order.items.length === 0) return null;
    const withVendor = order.items.find((i) => i.vendorId);
    return withVendor ? withVendor.vendorId : null;
};

// Admin: Create or update a review for an order (quality check after receiving products from vendor)
const createOrUpdateAdminReview = async (req, res) => {
    try {
        const adminId = req.user.id;
        const { orderId } = req.params;
        const { reviewComments, qualityCheckNotes, rating, approved, rejectionReason, returnToVendor } = req.body;

        // Validate orderId
        const isObjectId = /^[0-9a-fA-F]{24}$/.test(orderId);
        const whereClause = isObjectId ? { id: orderId } : { orderId: orderId };

        const order = await prisma.order.findUnique({
            where: whereClause,
            include: { items: true }
        });

        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
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

        const vendorId = resolveOrderVendorId(order);

        // Check if a review already exists for this order
        const existingReview = await prisma.adminReview.findUnique({
            where: { orderId: order.id }
        });

        // Review upsert + vendor aggregate recompute run in one transaction so
        // the denormalized Vendor.rating never goes out of sync with the
        // underlying review data.
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
                    where: { orderId: order.id },
                    data: basePayload,
                });
            } else {
                review = await tx.adminReview.create({
                    data: { orderId: order.id, ...basePayload },
                });
            }

            // Recompute vendor aggregate. If the vendor association changed
            // (unusual but possible), refresh both the old and new vendor.
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
            message: existingReview ? 'Admin review updated successfully' : 'Admin review created successfully'
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

        // Build where clause for admin reviews
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

        // Search at the database level so results span all pages.
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
                        include: { items: true }
                    }
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: Number(limit)
            }),
            prisma.adminReview.count({ where }),
            prisma.adminReview.count({ where: { ...where, approved: true } }),
            prisma.adminReview.count({ where: { ...where, approved: false } }),
        ]);

        // When scoped to a vendor, compute star distribution for the rating chart.
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
                totalPages: Math.ceil(totalCount / Number(limit))
            },
            stats: {
                total: totalCount,
                approved: approvedCount,
                rejected: rejectedCount
            },
            ...(ratingDistribution && { ratingDistribution }),
        });
    } catch (error) {
        console.error('Error fetching admin reviews:', error);
        res.status(500).json({ success: false, message: 'Error fetching admin reviews', error: error.message });
    }
};

// Admin: Get admin review for a specific order
const getAdminReviewByOrder = async (req, res) => {
    try {
        const { orderId } = req.params;

        const isObjectId = /^[0-9a-fA-F]{24}$/.test(orderId);
        const orderWhere = isObjectId ? { id: orderId } : { orderId: orderId };

        const order = await prisma.order.findUnique({ where: orderWhere });
        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        const review = await prisma.adminReview.findUnique({
            where: { orderId: order.id },
            include: {
                order: {
                    include: { items: true }
                }
            }
        });

        if (!review) {
            return res.status(404).json({ success: false, message: 'No admin review found for this order' });
        }

        res.status(200).json({ success: true, data: review });
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
    createOrUpdateAdminReview,
    getAllAdminReviews,
    getAdminReviewByOrder,
    deleteAdminReview
};
