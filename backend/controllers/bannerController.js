const { prisma } = require('../config/database');
const { uploadToCloudinary, deleteFromCloudinary } = require('../config/cloudinary');

// Get all banners (admin - includes inactive)
const getAllBanners = async (req, res) => {
    try {
        const banners = await prisma.bannerImage.findMany({
            orderBy: { displayOrder: 'asc' }
        });

        res.json({
            success: true,
            data: banners
        });
    } catch (error) {
        console.error('Get all banners error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch banners'
        });
    }
};

// Get active banners (public - no auth required)
const getActiveBanners = async (req, res) => {
    try {
        const banners = await prisma.bannerImage.findMany({
            where: { isActive: true },
            orderBy: { displayOrder: 'asc' },
            select: {
                id: true,
                imageUrl: true,
                altText: true,
                displayOrder: true
            }
        });

        res.json({
            success: true,
            data: banners
        });
    } catch (error) {
        console.error('Get active banners error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch banners'
        });
    }
};

// Add a new banner
const addBanner = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: 'Banner image is required'
            });
        }

        const { altText } = req.body;

        // Upload image to Cloudinary
        const result = await uploadToCloudinary(req.file.buffer, {
            folder: 'banner-images',
            resource_type: 'image',
            transformation: [
                { quality: 'auto' },
                { format: 'auto' }
            ]
        });

        // Get the next display order
        const lastBanner = await prisma.bannerImage.findFirst({
            orderBy: { displayOrder: 'desc' }
        });
        const displayOrder = lastBanner ? lastBanner.displayOrder + 1 : 0;

        const banner = await prisma.bannerImage.create({
            data: {
                imageUrl: result.secure_url,
                altText: altText || null,
                displayOrder,
                isActive: true,
                updatedBy: req.user?.id
            }
        });

        res.status(201).json({
            success: true,
            message: 'Banner added successfully',
            data: banner
        });
    } catch (error) {
        console.error('Add banner error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to add banner'
        });
    }
};

// Update a banner (image and/or metadata)
const updateBanner = async (req, res) => {
    try {
        const { id } = req.params;
        const { altText, isActive, displayOrder } = req.body;

        const existing = await prisma.bannerImage.findUnique({ where: { id } });
        if (!existing) {
            return res.status(404).json({
                success: false,
                error: 'Banner not found'
            });
        }

        const updateData = { updatedBy: req.user?.id };

        if (altText !== undefined) updateData.altText = altText;
        if (isActive !== undefined) updateData.isActive = isActive === 'true' || isActive === true;
        if (displayOrder !== undefined) updateData.displayOrder = parseInt(displayOrder, 10);

        // Handle new image upload
        if (req.file) {
            const result = await uploadToCloudinary(req.file.buffer, {
                folder: 'banner-images',
                resource_type: 'image',
                transformation: [
                    { quality: 'auto' },
                    { format: 'auto' }
                ]
            });
            updateData.imageUrl = result.secure_url;

            // Delete old image from Cloudinary
            if (existing.imageUrl) {
                try {
                    const publicId = existing.imageUrl.split('/').pop().split('.')[0];
                    await deleteFromCloudinary(`banner-images/${publicId}`);
                } catch (deleteError) {
                    console.warn('Failed to delete old banner image:', deleteError);
                }
            }
        }

        const banner = await prisma.bannerImage.update({
            where: { id },
            data: updateData
        });

        res.json({
            success: true,
            message: 'Banner updated successfully',
            data: banner
        });
    } catch (error) {
        console.error('Update banner error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update banner'
        });
    }
};

// Delete a banner
const deleteBanner = async (req, res) => {
    try {
        const { id } = req.params;

        const existing = await prisma.bannerImage.findUnique({ where: { id } });
        if (!existing) {
            return res.status(404).json({
                success: false,
                error: 'Banner not found'
            });
        }

        // Delete image from Cloudinary
        if (existing.imageUrl) {
            try {
                const publicId = existing.imageUrl.split('/').pop().split('.')[0];
                await deleteFromCloudinary(`banner-images/${publicId}`);
            } catch (deleteError) {
                console.warn('Failed to delete banner image from Cloudinary:', deleteError);
            }
        }

        await prisma.bannerImage.delete({ where: { id } });

        res.json({
            success: true,
            message: 'Banner deleted successfully'
        });
    } catch (error) {
        console.error('Delete banner error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete banner'
        });
    }
};

// Reorder banners
const reorderBanners = async (req, res) => {
    try {
        const { orderedIds } = req.body;

        if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'orderedIds array is required'
            });
        }

        // Update each banner's display order
        await Promise.all(
            orderedIds.map((id, index) =>
                prisma.bannerImage.update({
                    where: { id },
                    data: { displayOrder: index }
                })
            )
        );

        const banners = await prisma.bannerImage.findMany({
            orderBy: { displayOrder: 'asc' }
        });

        res.json({
            success: true,
            message: 'Banners reordered successfully',
            data: banners
        });
    } catch (error) {
        console.error('Reorder banners error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to reorder banners'
        });
    }
};

module.exports = {
    getAllBanners,
    getActiveBanners,
    addBanner,
    updateBanner,
    deleteBanner,
    reorderBanners
};
