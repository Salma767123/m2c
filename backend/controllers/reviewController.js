const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Create a review
exports.createReview = async (req, res) => {
    try {
        const { productId, orderId, rating, comment, images } = req.body;
        const userId = req.user.id;

        // Validate inputs
        if (!productId || !orderId || !rating) {
            return res.status(400).json({ success: false, message: 'Missing required fields' });
        }

        // Check if review already exists
        const existingReview = await prisma.review.findUnique({
            where: {
                userId_productId_orderId: {
                    userId,
                    productId,
                    orderId
                }
            }
        });

        if (existingReview) {
            return res.status(400).json({ success: false, message: 'You have already reviewed this product for this order' });
        }

        // Verify that the user successfully purchased the product in this order
        const order = await prisma.order.findFirst({
            where: {
                id: orderId,
                customerId: userId,
                items: {
                    some: {
                        productId: productId
                    }
                }
            }
        });

        if (!order) {
            return res.status(403).json({ success: false, message: 'You can only review products from your purchased orders' });
        }

        const review = await prisma.review.create({
            data: {
                userId,
                productId,
                orderId,
                rating: Number(rating),
                comment,
                images: images || [],
                isApproved: true
            }
        });

        // Update product average rating
        const allReviews = await prisma.review.findMany({
            where: { productId, isApproved: true }
        });

        const totalRating = allReviews.reduce((sum, rev) => sum + rev.rating, 0);
        const avgRating = totalRating / allReviews.length;

        await prisma.product.update({
            where: { id: productId },
            data: {
                rating: avgRating,
                reviews: allReviews.length
            }
        });

        res.status(201).json({ success: true, data: review, message: 'Review submitted successfully' });
    } catch (error) {
        console.error('Error creating review:', error);
        res.status(500).json({ success: false, message: 'Error creating review', error: error.message });
    }
};

// Get reviews for a product
exports.getProductReviews = async (req, res) => {
    try {
        const { productId } = req.params;

        const reviews = await prisma.review.findMany({
            where: {
                productId,
                isApproved: true
            },
            include: {
                user: {
                    select: {
                        name: true,
                        image: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        res.status(200).json({ success: true, data: reviews });
    } catch (error) {
        console.error('Error fetching reviews:', error);
        res.status(500).json({ success: false, message: 'Error fetching reviews', error: error.message });
    }
};

// Try to check if user has reviewed an item
exports.checkReviewStatus = async (req, res) => {
    try {
        const { productId, orderId } = req.query;
        const userId = req.user.id;

        if (!productId || !orderId) {
            return res.status(400).json({ success: false, message: 'Missing product or order ID' });
        }

        const review = await prisma.review.findUnique({
            where: {
                userId_productId_orderId: {
                    userId,
                    productId,
                    orderId
                }
            }
        });

        res.status(200).json({ success: true, hasReviewed: !!review, data: review });
    } catch (error) {
        console.error('Error checking review status:', error);
        res.status(500).json({ success: false, message: 'Error checking review status' });
    }
};

// ==========================================
// ADMIN ENDPOINTS
// ==========================================

// Get all reviews (admin)
exports.getAllReviews = async (req, res) => {
    try {
        const { search, status, page = 1, limit = 20 } = req.query;
        const skip = (Number(page) - 1) * Number(limit);

        // Build where clause
        const where = {};

        if (status && status !== 'all') {
            if (status === 'approved') {
                where.isApproved = true;
            } else if (status === 'rejected') {
                where.isApproved = false;
            }
        }

        const reviews = await prisma.review.findMany({
            where,
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        image: true
                    }
                },
                product: {
                    select: {
                        id: true,
                        name: true,
                        images: {
                            select: { url: true, isPrimary: true },
                            orderBy: { isPrimary: 'desc' },
                            take: 1
                        }
                    }
                },
                order: {
                    select: {
                        id: true,
                        orderId: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            },
            skip,
            take: Number(limit)
        });

        // Apply search filter in JS (MongoDB doesn't support easy OR across relations)
        let filteredReviews = reviews;
        if (search) {
            const searchLower = search.toLowerCase();
            filteredReviews = reviews.filter(review =>
                (review.user?.name || '').toLowerCase().includes(searchLower) ||
                (review.user?.email || '').toLowerCase().includes(searchLower) ||
                (review.product?.name || '').toLowerCase().includes(searchLower) ||
                (review.comment || '').toLowerCase().includes(searchLower)
            );
        }

        // Get counts
        const totalCount = await prisma.review.count();
        const approvedCount = await prisma.review.count({ where: { isApproved: true } });
        const rejectedCount = await prisma.review.count({ where: { isApproved: false } });

        // Calculate average rating
        const allReviews = await prisma.review.findMany({
            select: { rating: true }
        });
        const avgRating = allReviews.length > 0
            ? allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length
            : 0;

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
                rejected: rejectedCount,
                averageRating: Math.round(avgRating * 10) / 10
            }
        });
    } catch (error) {
        console.error('Error fetching all reviews:', error);
        res.status(500).json({ success: false, message: 'Error fetching reviews', error: error.message });
    }
};

// Update review status (approve/reject)
exports.updateReviewStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { isApproved } = req.body;

        if (typeof isApproved !== 'boolean') {
            return res.status(400).json({ success: false, message: 'isApproved must be a boolean value' });
        }

        const review = await prisma.review.findUnique({
            where: { id }
        });

        if (!review) {
            return res.status(404).json({ success: false, message: 'Review not found' });
        }

        const updatedReview = await prisma.review.update({
            where: { id },
            data: { isApproved },
            include: {
                user: {
                    select: { name: true, email: true }
                },
                product: {
                    select: { id: true, name: true }
                }
            }
        });

        // Recalculate product average rating (only approved reviews count)
        const approvedReviews = await prisma.review.findMany({
            where: { productId: review.productId, isApproved: true }
        });

        const avgRating = approvedReviews.length > 0
            ? approvedReviews.reduce((sum, r) => sum + r.rating, 0) / approvedReviews.length
            : 0;

        await prisma.product.update({
            where: { id: review.productId },
            data: {
                rating: avgRating,
                reviews: approvedReviews.length
            }
        });

        res.status(200).json({
            success: true,
            data: updatedReview,
            message: `Review ${isApproved ? 'approved' : 'rejected'} successfully`
        });
    } catch (error) {
        console.error('Error updating review status:', error);
        res.status(500).json({ success: false, message: 'Error updating review status', error: error.message });
    }
};

// Delete a review (admin)
exports.deleteReview = async (req, res) => {
    try {
        const { id } = req.params;

        const review = await prisma.review.findUnique({
            where: { id }
        });

        if (!review) {
            return res.status(404).json({ success: false, message: 'Review not found' });
        }

        await prisma.review.delete({
            where: { id }
        });

        // Recalculate product average rating after deletion
        const remainingReviews = await prisma.review.findMany({
            where: { productId: review.productId, isApproved: true }
        });

        const avgRating = remainingReviews.length > 0
            ? remainingReviews.reduce((sum, r) => sum + r.rating, 0) / remainingReviews.length
            : 0;

        await prisma.product.update({
            where: { id: review.productId },
            data: {
                rating: avgRating,
                reviews: remainingReviews.length
            }
        });

        res.status(200).json({ success: true, message: 'Review deleted successfully' });
    } catch (error) {
        console.error('Error deleting review:', error);
        res.status(500).json({ success: false, message: 'Error deleting review', error: error.message });
    }
};
