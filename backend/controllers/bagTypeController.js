const { prisma } = require('../config/database');
const { uploadDataUriIfBase64 } = require('../config/cloudinary');

// Public: Get active bag types for cart page
const getActiveBagTypes = async (req, res) => {
    try {
        const bagTypes = await prisma.bagType.findMany({
            where: { isActive: true },
            orderBy: { sortOrder: 'asc' },
            select: {
                id: true,
                name: true,
                description: true,
                price: true,
                priceINR: true,
                priceUSD: true,
                image: true,
            },
        });

        res.json({ success: true, data: bagTypes });
    } catch (error) {
        console.error('Get active bag types error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch bag types' });
    }
};

// Admin: Get all bag types with pagination
const getBagTypes = async (req, res) => {
    try {
        const { page = 1, limit = 10, search, isActive } = req.query;
        const pageNum = Math.max(1, parseInt(page) || 1);
        const limitNum = Math.max(1, Math.min(100, parseInt(limit) || 10));
        const skip = (pageNum - 1) * limitNum;

        const where = {};

        if (search) {
            where.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } },
            ];
        }

        if (isActive === 'true') where.isActive = true;
        if (isActive === 'false') where.isActive = false;

        const [bagTypes, total, activeCount, inactiveCount, salesAgg, salesPerBag] = await Promise.all([
            prisma.bagType.findMany({
                where,
                orderBy: { sortOrder: 'asc' },
                skip,
                take: limitNum,
            }),
            prisma.bagType.count({ where }),
            prisma.bagType.count({ where: { isActive: true } }),
            prisma.bagType.count({ where: { isActive: false } }),
            prisma.order.aggregate({
                where: { bagTypeId: { not: null } },
                _count: true,
                _sum: { bagTypePrice: true },
            }),
            prisma.order.groupBy({
                by: ['bagTypeId'],
                where: { bagTypeId: { not: null } },
                _count: true,
                _sum: { bagTypePrice: true },
            }),
        ]);

        res.json({
            success: true,
            data: bagTypes,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total,
                pages: Math.ceil(total / limitNum),
            },
            stats: {
                total: activeCount + inactiveCount,
                active: activeCount,
                inactive: inactiveCount,
                totalBagsSold: salesAgg._count || 0,
                totalRevenue: salesAgg._sum?.bagTypePrice || 0,
                perBagType: salesPerBag.map(s => ({
                    bagTypeId: s.bagTypeId,
                    sold: s._count,
                    revenue: s._sum?.bagTypePrice || 0,
                })),
            },
        });
    } catch (error) {
        console.error('Get bag types error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch bag types' });
    }
};

// Admin: Get single bag type
const getBagType = async (req, res) => {
    try {
        const bagType = await prisma.bagType.findUnique({
            where: { id: req.params.id },
        });

        if (!bagType) {
            return res.status(404).json({ success: false, message: 'Bag type not found' });
        }

        res.json({ success: true, data: bagType });
    } catch (error) {
        console.error('Get bag type error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch bag type' });
    }
};

// Admin: Create bag type
const createBagType = async (req, res) => {
    try {
        const { name, description, price, priceINR, priceUSD, image, isActive = true, sortOrder = 0 } = req.body;

        if (!name || !String(name).trim() || price === undefined || price === null) {
            return res.status(400).json({ success: false, message: 'Name and price are required' });
        }

        if (!Number.isFinite(price) || price <= 0) {
            return res.status(400).json({ success: false, message: 'Price must be a positive number' });
        }

        // Validate and upload image if base64
        let imageUrl = image || null;
        if (image && typeof image === 'string' && image.startsWith('data:')) {
            if (!/^data:image\/(jpeg|jpg|png|webp|gif);base64,/.test(image)) {
                return res.status(400).json({ success: false, message: 'Only JPEG, PNG, WebP, or GIF images are allowed' });
            }
            const base64Data = image.split(',')[1];
            if (base64Data && Math.ceil(base64Data.length * 0.75) > 5 * 1024 * 1024) {
                return res.status(400).json({ success: false, message: 'Image must be under 5 MB' });
            }
            imageUrl = await uploadDataUriIfBase64(image, { folder: 'bag-types' });
        }

        const trimmedName = String(name).trim();

        // Check for duplicate name
        const existing = await prisma.bagType.findFirst({ where: { name: { equals: trimmedName, mode: 'insensitive' } } });
        if (existing) {
            return res.status(400).json({ success: false, message: 'A bag type with this name already exists' });
        }

        // Auto-assign sort order if not explicitly provided
        let finalSortOrder = Math.max(0, parseInt(sortOrder) || 0);
        if (!sortOrder && sortOrder !== 0) {
            const maxSort = await prisma.bagType.aggregate({ _max: { sortOrder: true } });
            finalSortOrder = (maxSort._max?.sortOrder ?? 0) + 1;
        }

        const bagType = await prisma.bagType.create({
            data: {
                name: trimmedName,
                description: description || null,
                price,
                priceINR: priceINR ? parseFloat(priceINR) : null,
                priceUSD: priceUSD ? parseFloat(priceUSD) : null,
                image: imageUrl,
                isActive,
                sortOrder: finalSortOrder,
            },
        });

        res.status(201).json({ success: true, data: bagType, message: 'Bag type created successfully' });
    } catch (error) {
        console.error('Create bag type error:', error);
        res.status(500).json({ success: false, message: 'Failed to create bag type' });
    }
};

// Admin: Update bag type
const updateBagType = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, price, priceINR, priceUSD, image, isActive, sortOrder } = req.body;

        const existing = await prisma.bagType.findUnique({ where: { id } });
        if (!existing) {
            return res.status(404).json({ success: false, message: 'Bag type not found' });
        }

        if (price !== undefined && (!Number.isFinite(price) || price <= 0)) {
            return res.status(400).json({ success: false, message: 'Price must be a positive number' });
        }

        // Check for duplicate name (excluding self)
        if (name !== undefined) {
            const trimmed = String(name).trim();
            if (!trimmed) {
                return res.status(400).json({ success: false, message: 'Name cannot be empty' });
            }
            const duplicate = await prisma.bagType.findFirst({
                where: { name: { equals: trimmed, mode: 'insensitive' }, id: { not: id } },
            });
            if (duplicate) {
                return res.status(400).json({ success: false, message: 'A bag type with this name already exists' });
            }
        }

        const updateData = {};
        if (name !== undefined) updateData.name = String(name).trim() || existing.name;
        if (description !== undefined) updateData.description = description;
        if (price !== undefined) updateData.price = price;
        if (priceINR !== undefined) updateData.priceINR = priceINR ? parseFloat(priceINR) : null;
        if (priceUSD !== undefined) updateData.priceUSD = priceUSD ? parseFloat(priceUSD) : null;
        if (isActive !== undefined) updateData.isActive = isActive;
        if (sortOrder !== undefined) updateData.sortOrder = Math.max(0, parseInt(sortOrder) || 0);

        // Validate and upload new image if base64, keep existing if not provided
        if (image !== undefined) {
            if (image && typeof image === 'string' && image.startsWith('data:')) {
                if (!/^data:image\/(jpeg|jpg|png|webp|gif);base64,/.test(image)) {
                    return res.status(400).json({ success: false, message: 'Only JPEG, PNG, WebP, or GIF images are allowed' });
                }
                const base64Data = image.split(',')[1];
                if (base64Data && Math.ceil(base64Data.length * 0.75) > 5 * 1024 * 1024) {
                    return res.status(400).json({ success: false, message: 'Image must be under 5 MB' });
                }
                updateData.image = await uploadDataUriIfBase64(image, { folder: 'bag-types' });
            } else {
                updateData.image = image || null;
            }
        }

        const bagType = await prisma.bagType.update({
            where: { id },
            data: updateData,
        });

        res.json({ success: true, data: bagType, message: 'Bag type updated successfully' });
    } catch (error) {
        console.error('Update bag type error:', error);
        res.status(500).json({ success: false, message: 'Failed to update bag type' });
    }
};

// Admin: Delete bag type
const deleteBagType = async (req, res) => {
    try {
        const { id } = req.params;

        const existing = await prisma.bagType.findUnique({ where: { id } });
        if (!existing) {
            return res.status(404).json({ success: false, message: 'Bag type not found' });
        }

        await prisma.bagType.delete({ where: { id } });

        res.json({ success: true, message: 'Bag type deleted successfully' });
    } catch (error) {
        console.error('Delete bag type error:', error);
        res.status(500).json({ success: false, message: 'Failed to delete bag type' });
    }
};

module.exports = {
    getActiveBagTypes,
    getBagTypes,
    getBagType,
    createBagType,
    updateBagType,
    deleteBagType,
};
