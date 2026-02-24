const { prisma } = require('../config/database');

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

        // Check if a review already exists for this order
        const existingReview = await prisma.adminReview.findUnique({
            where: { orderId: order.id }
        });

        let review;
        if (existingReview) {
            // Update existing review
            review = await prisma.adminReview.update({
                where: { orderId: order.id },
                data: {
                    reviewComments: reviewComments || null,
                    qualityCheckNotes: qualityCheckNotes || null,
                    rating: rating ? parseInt(rating) : null,
                    approved,
                    rejectionReason: !approved ? (rejectionReason || null) : null,
                    returnToVendor: returnToVendor || false,
                    reviewedBy: adminId,
                    reviewedAt: new Date()
                }
            });
        } else {
            // Create new review
            review = await prisma.adminReview.create({
                data: {
                    orderId: order.id,
                    reviewComments: reviewComments || null,
                    qualityCheckNotes: qualityCheckNotes || null,
                    rating: rating ? parseInt(rating) : null,
                    approved,
                    rejectionReason: !approved ? (rejectionReason || null) : null,
                    returnToVendor: returnToVendor || false,
                    reviewedBy: adminId,
                    reviewedAt: new Date()
                }
            });
        }

        res.status(existingReview ? 200 : 201).json({
            success: true,
            data: review,
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
        const { search, status, page = 1, limit = 50 } = req.query;
        const skip = (Number(page) - 1) * Number(limit);

        // Build where clause for admin reviews
        const where = {};

        if (status && status !== 'all') {
            if (status === 'approved') {
                where.approved = true;
            } else if (status === 'rejected') {
                where.approved = false;
            }
        }

        const reviews = await prisma.adminReview.findMany({
            where,
            include: {
                order: {
                    include: {
                        items: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' },
            skip,
            take: Number(limit)
        });

        // Apply search filter in JS (across order/item fields)
        let filteredReviews = reviews;
        if (search) {
            const searchLower = search.toLowerCase();
            filteredReviews = reviews.filter(review => {
                const order = review.order;
                if (!order) return false;
                return (
                    (order.orderId || '').toLowerCase().includes(searchLower) ||
                    (order.customerName || '').toLowerCase().includes(searchLower) ||
                    order.items.some(item =>
                        (item.productName || '').toLowerCase().includes(searchLower) ||
                        (item.vendorName || '').toLowerCase().includes(searchLower) ||
                        (item.sku || '').toLowerCase().includes(searchLower)
                    ) ||
                    (review.reviewComments || '').toLowerCase().includes(searchLower) ||
                    (review.qualityCheckNotes || '').toLowerCase().includes(searchLower)
                );
            });
        }

        // Get counts
        const totalCount = await prisma.adminReview.count();
        const approvedCount = await prisma.adminReview.count({ where: { approved: true } });
        const rejectedCount = await prisma.adminReview.count({ where: { approved: false } });

        res.status(200).json({
            success: true,
            data: filteredReviews,
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
            }
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

        const review = await prisma.adminReview.findUnique({ where: { id } });
        if (!review) {
            return res.status(404).json({ success: false, message: 'Admin review not found' });
        }

        await prisma.adminReview.delete({ where: { id } });

        res.status(200).json({ success: true, message: 'Admin review deleted successfully' });
    } catch (error) {
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
