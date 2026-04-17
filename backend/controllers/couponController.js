const { PrismaClient } = require('@prisma/client');

// Use a module-level singleton with connection retry settings
const prisma = new PrismaClient({
    datasources: {
        db: {
            url: process.env.DATABASE_URL,
        },
    },
});

// Create a new coupon (Admin only)
const createCoupon = async (req, res) => {
    try {
        const {
            code,
            description,
            discountType,
            discountValue,
            minPurchaseAmount,
            maxDiscountAmount,
            startDate,
            expiryDate,
            usageLimit,
            perUserLimit,
            isActive,
            freeShipping,
            freeShippingOrderNumbers
        } = req.body;

        // Check if coupon code already exists
        const existingCoupon = await prisma.coupon.findUnique({
            where: { code }
        });

        if (existingCoupon) {
            return res.status(400).json({
                success: false,
                message: 'Coupon code already exists'
            });
        }

        const coupon = await prisma.coupon.create({
            data: {
                code,
                description,
                discountType,
                discountValue,
                minPurchaseAmount,
                maxDiscountAmount,
                startDate: startDate ? new Date(startDate) : undefined,
                expiryDate: new Date(expiryDate),
                usageLimit,
                perUserLimit,
                isActive: isActive !== undefined ? isActive : true,
                freeShipping: freeShipping || false,
                freeShippingOrderNumbers: freeShippingOrderNumbers || []
            }
        });
       
        res.status(201).json({
            success: true,
            data: coupon,
            message: 'Coupon created successfully'
        });
    } catch (error) {
        console.error('Create coupon error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create coupon',
            error: error.message
        });
    }
};

// Get all coupons (Admin only)
const getCoupons = async (req, res) => {
    try {
        const { page = 1, limit = 10, search, isActive } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);

        const where = {};

        if (search) {
            where.code = { contains: search, mode: 'insensitive' };
        }

        if (isActive !== undefined) {
            where.isActive = isActive === 'true';
        }

        const [coupons, total] = await Promise.all([
            prisma.coupon.findMany({
                where,
                skip,
                take: parseInt(limit),
                orderBy: { createdAt: 'desc' }
            }),
            prisma.coupon.count({ where })
        ]);

        const totalPages = Math.ceil(total / parseInt(limit));

        res.json({
            success: true,
            data: {
                coupons,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages,
                    totalItems: total,
                    limit: parseInt(limit)
                }
            }
        });
    } catch (error) {
        console.error('Get coupons error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch coupons'
        });
    }
};

// Get single coupon
const getCoupon = async (req, res) => {
    try {
        const { id } = req.params;

        const coupon = await prisma.coupon.findUnique({
            where: { id }
        });

        if (!coupon) {
            return res.status(404).json({
                success: false,
                message: 'Coupon not found'
            });
        }

        res.json({
            success: true,
            data: coupon
        });
    } catch (error) {
        console.error('Get coupon error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch coupon'
        });
    }
};

// Update coupon
const updateCoupon = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;

        // Remove immutable fields if present in body
        delete updateData.id;
        delete updateData.createdAt;
        delete updateData.updatedAt;

        if (updateData.startDate) updateData.startDate = new Date(updateData.startDate);
        if (updateData.expiryDate) updateData.expiryDate = new Date(updateData.expiryDate);

        const coupon = await prisma.coupon.update({
            where: { id },
            data: updateData
        });

        res.json({
            success: true,
            data: coupon,
            message: 'Coupon updated successfully'
        });
    } catch (error) {
        console.error('Update coupon error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update coupon'
        });
    }
};

// Delete coupon
const deleteCoupon = async (req, res) => {
    try {
        const { id } = req.params;

        await prisma.coupon.delete({
            where: { id }
        });

        res.json({
            success: true,
            message: 'Coupon deleted successfully'
        });
    } catch (error) {
        console.error('Delete coupon error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete coupon'
        });
    }
};

// Validate and apply coupon
const applyCoupon = async (req, res) => {
    try {
        const { code, cartTotal, userId } = req.body;

        if (!code) {
            return res.status(400).json({
                success: false,
                message: 'Coupon code is required'
            });
        }

        const coupon = await prisma.coupon.findUnique({
            where: { code }
        });

        if (!coupon) {
            return res.status(404).json({
                success: false,
                message: 'Invalid coupon code'
            });
        }

        // Check if active
        if (!coupon.isActive) {
            return res.status(400).json({
                success: false,
                message: 'This coupon is no longer active'
            });
        }

        // Check expiry
        const now = new Date();
        if (now < coupon.startDate || now > coupon.expiryDate) {
            return res.status(400).json({
                success: false,
                message: 'This coupon has expired or is not yet valid'
            });
        }

        // Check usage limit
        if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
            return res.status(400).json({
                success: false,
                message: 'This coupon has reached its usage limit'
            });
        }

        // Check minimum purchase amount
        if (coupon.minPurchaseAmount && cartTotal < coupon.minPurchaseAmount) {
            return res.status(400).json({
                success: false,
                message: `Minimum purchase amount of ₹${coupon.minPurchaseAmount} required`
            });
        }

        // Check free shipping Nth order condition
        if (coupon.freeShipping && coupon.freeShippingOrderNumbers && coupon.freeShippingOrderNumbers.length > 0 && userId) {
            const userOrderCount = await prisma.order.count({ where: { customerId: userId } });
            const nextOrderNumber = userOrderCount + 1;

            if (!coupon.freeShippingOrderNumbers.includes(nextOrderNumber)) {
                const orderList = coupon.freeShippingOrderNumbers
                    .map(n => `${n}${getOrdinalSuffix(n)}`)
                    .join(', ');
                return res.status(400).json({
                    success: false,
                    message: `This coupon gives free shipping on your ${orderList} order(s). Your next order is #${nextOrderNumber}.`
                });
            }
        }

        // Calculate discount
        let discountAmount = 0;
        if (coupon.discountType === 'PERCENTAGE') {
            discountAmount = (cartTotal * coupon.discountValue) / 100;

            // Apply max discount cap if set
            if (coupon.maxDiscountAmount && discountAmount > coupon.maxDiscountAmount) {
                discountAmount = coupon.maxDiscountAmount;
            }
        } else {
            // FIXED_AMOUNT
            discountAmount = coupon.discountValue;
        }

        // Ensure discount doesn't exceed total
        if (discountAmount > cartTotal) {
            discountAmount = cartTotal;
        }

        res.json({
            success: true,
            data: {
                code: coupon.code,
                discountType: coupon.discountType,
                discountValue: coupon.discountValue,
                discountAmount,
                minPurchaseAmount: coupon.minPurchaseAmount,
                freeShipping: coupon.freeShipping || false,
                freeShippingOrderNumbers: coupon.freeShippingOrderNumbers || []
            },
            message: coupon.freeShipping
                ? 'Coupon applied successfully — Free shipping included!'
                : 'Coupon applied successfully'
        });

    } catch (error) {
        console.error('Apply coupon error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to validate coupon'
        });
    }
};

// Apply free shipping offer (separate function)
const applyFreeShippingOffer = async (req, res) => {
    try {
        const { userId, cartTotal } = req.body;

        if (!userId) {
            return res.status(400).json({
                success: false,
                message: 'User ID is required'
            });
        }

        // Get user's order count
        const userOrderCount = await prisma.order.count({ where: { customerId: userId } });
        const nextOrderNumber = userOrderCount + 1;

        // Get active free shipping offers
        const activeOffers = await prisma.freeShippingOffer.findMany({
            where: { isActive: true },
            orderBy: { createdAt: 'desc' }
        });

        // Check each offer
        for (const offer of activeOffers) {
            // Check minimum order value
            if (offer.minOrderValue > 0 && cartTotal < offer.minOrderValue) {
                continue;
            }

            // Check order number condition
            if (offer.orderNumbers.length > 0) {
                if (!offer.orderNumbers.includes(nextOrderNumber)) {
                    continue;
                }
            }

            // If we reach here, this offer applies
            return res.json({
                success: true,
                data: {
                    freeShipping: true,
                    offer: {
                        id: offer.id,
                        minOrderValue: offer.minOrderValue,
                        orderNumbers: offer.orderNumbers
                    },
                    nextOrderNumber,
                    discountAmount: 0, // Free shipping doesn't give monetary discount
                    message: 'Free shipping available!'
                },
                message: 'Free shipping offer applied successfully!'
            });
        }

        res.json({
            success: false,
            data: {
                freeShipping: false,
                nextOrderNumber
            },
            message: 'No free shipping offers available for this order'
        });

    } catch (error) {
        console.error('Apply free shipping offer error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to apply free shipping offer'
        });
    }
};

// Get promotional coupons (Public endpoint)
const getPromotionalCoupons = async (req, res) => {
    try {
        const { limit = 10 } = req.query;

        const coupons = await prisma.coupon.findMany({
            where: {
                isActive: true
            },
            select: {
                id: true,
                code: true,
                description: true,
                discountType: true,
                discountValue: true,
                isActive: true
            },
            take: parseInt(limit),
            orderBy: { createdAt: 'desc' }
        });

        // Transform coupons into promotional messages
        const promotionalMessages = coupons.map(coupon => {
            // Use description if available, otherwise create from coupon data
            if (coupon.description && coupon.description.trim()) {
                return coupon.description;
            }
            
            // Create promotional message from coupon data
            const discountText = coupon.discountType === 'PERCENTAGE' 
                ? `${coupon.discountValue}% off`
                : `₹${coupon.discountValue} off`;
            
            return `Use code ${coupon.code} for ${discountText}`;
        });

        res.json({
            success: true,
            data: promotionalMessages.filter(msg => msg && msg.trim()) // Filter out empty messages
        });
    } catch (error) {
        console.error('Get promotional coupons error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch promotional coupons',
            data: []
        });
    }
};

// Helper: get ordinal suffix (1st, 2nd, 3rd, etc.)
function getOrdinalSuffix(n) {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return s[(v - 20) % 10] || s[v] || s[0];
}

// ============================================
// FREE SHIPPING OFFERS MANAGEMENT
// ============================================

// Create a new free shipping offer (Admin only)
const createFreeShippingOffer = async (req, res) => {
    try {
        const {
            minOrderValue,
            orderNumbers,
            isActive
        } = req.body;

        const offer = await prisma.freeShippingOffer.create({
            data: {
                minOrderValue: minOrderValue || 0,
                orderNumbers: orderNumbers || [],
                isActive: isActive !== undefined ? isActive : true
            }
        });

        res.status(201).json({
            success: true,
            data: offer,
            message: 'Free shipping offer created successfully'
        });
    } catch (error) {
        console.error('Create free shipping offer error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create free shipping offer',
            error: error.message
        });
    }
};

// Get all free shipping offers (Admin only)
const getFreeShippingOffers = async (req, res) => {
    try {
        const { page = 1, limit = 10, isActive } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);

        const where = {};
        if (isActive !== undefined) {
            where.isActive = isActive === 'true';
        }

        const [offers, total] = await Promise.all([
            prisma.freeShippingOffer.findMany({
                where,
                skip,
                take: parseInt(limit),
                orderBy: { createdAt: 'desc' }
            }),
            prisma.freeShippingOffer.count({ where })
        ]);

        const totalPages = Math.ceil(total / parseInt(limit));

        res.json({
            success: true,
            data: {
                offers,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages,
                    totalItems: total,
                    limit: parseInt(limit)
                }
            }
        });
    } catch (error) {
        console.error('Get free shipping offers error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch free shipping offers'
        });
    }
};

// Get single free shipping offer
const getFreeShippingOffer = async (req, res) => {
    try {
        const { id } = req.params;

        const offer = await prisma.freeShippingOffer.findUnique({
            where: { id }
        });

        if (!offer) {
            return res.status(404).json({
                success: false,
                message: 'Free shipping offer not found'
            });
        }

        res.json({
            success: true,
            data: offer
        });
    } catch (error) {
        console.error('Get free shipping offer error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch free shipping offer'
        });
    }
};

// Update free shipping offer
const updateFreeShippingOffer = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;

        // Remove immutable fields if present in body
        delete updateData.id;
        delete updateData.createdAt;
        delete updateData.updatedAt;

        const offer = await prisma.freeShippingOffer.update({
            where: { id },
            data: updateData
        });

        res.json({
            success: true,
            data: offer,
            message: 'Free shipping offer updated successfully'
        });
    } catch (error) {
        console.error('Update free shipping offer error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update free shipping offer'
        });
    }
};

// Delete free shipping offer
const deleteFreeShippingOffer = async (req, res) => {
    try {
        const { id } = req.params;

        await prisma.freeShippingOffer.delete({
            where: { id }
        });

        res.json({
            success: true,
            message: 'Free shipping offer deleted successfully'
        });
    } catch (error) {
        console.error('Delete free shipping offer error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete free shipping offer'
        });
    }
};

// Check if free shipping applies for a user's order
const checkFreeShipping = async (req, res) => {
    try {
        const { userId, cartTotal } = req.body;

        if (!userId) {
            return res.status(400).json({
                success: false,
                message: 'User ID is required'
            });
        }

        // Get user's order count
        const userOrderCount = await prisma.order.count({ where: { customerId: userId } });
        const nextOrderNumber = userOrderCount + 1;

        // Get active free shipping offers
        const activeOffers = await prisma.freeShippingOffer.findMany({
            where: { isActive: true }
        });

        // Check each offer
        for (const offer of activeOffers) {
            // Check minimum order value
            if (offer.minOrderValue > 0 && cartTotal < offer.minOrderValue) {
                continue;
            }

            // Check order number condition
            if (offer.orderNumbers.length > 0) {
                if (!offer.orderNumbers.includes(nextOrderNumber)) {
                    continue;
                }
            }

            // If we reach here, this offer applies
            return res.json({
                success: true,
                data: {
                    freeShipping: true,
                    offer: {
                        id: offer.id,
                        description: offer.description,
                        minOrderValue: offer.minOrderValue,
                        orderNumbers: offer.orderNumbers
                    },
                    nextOrderNumber
                },
                message: 'Free shipping available!'
            });
        }

        res.json({
            success: true,
            data: {
                freeShipping: false,
                nextOrderNumber
            },
            message: 'No free shipping offers available'
        });

    } catch (error) {
        console.error('Check free shipping error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to check free shipping eligibility'
        });
    }
};

module.exports = {
    createCoupon,
    getCoupons,
    getCoupon,
    updateCoupon,
    deleteCoupon,
    applyCoupon,
    applyFreeShippingOffer,
    getPromotionalCoupons,
    // Free shipping offer functions
    createFreeShippingOffer,
    getFreeShippingOffers,
    getFreeShippingOffer,
    updateFreeShippingOffer,
    deleteFreeShippingOffer,
    checkFreeShipping
};
