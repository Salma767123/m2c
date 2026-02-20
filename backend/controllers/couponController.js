const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

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
            isActive
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
                isActive: isActive !== undefined ? isActive : true
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

        const [coupons, total] = await prisma.$transaction([
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
        const { code, cartTotal } = req.body; // cartTotal should be the subtotal

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
                message: `Minimum purchase amount of ${coupon.minPurchaseAmount} required`
            });
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
                discountAmount, // Calculated specific amount for this cart
                minPurchaseAmount: coupon.minPurchaseAmount
            },
            message: 'Coupon applied successfully'
        });

    } catch (error) {
        console.error('Apply coupon error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to validate coupon'
        });
    }
};

module.exports = {
    createCoupon,
    getCoupons,
    getCoupon,
    updateCoupon,
    deleteCoupon,
    applyCoupon
};
