const { PrismaClient } = require('@prisma/client');
const { uploadToCloudinary, deleteFromCloudinary } = require('../config/cloudinary');
const prisma = new PrismaClient();

// Get all SEO settings (for page management)
const getAllSEOSettings = async (req, res) => {
    try {
        const settings = await prisma.sEOSettings.findMany({
            orderBy: { page: 'asc' }
        });

        // Default pages if none exist
        const defaultPages = ['home', 'about', 'products', 'categories', 'contact', 'privacy', 'terms', 'shipping', 'returns'];
        
        if (settings.length === 0) {
            // Create default page settings
            const defaultSettings = await Promise.all(
                defaultPages.map(page => 
                    prisma.sEOSettings.create({
                        data: { page }
                    })
                )
            );
            return res.json({
                success: true,
                data: defaultSettings
            });
        }

        res.json({
            success: true,
            data: settings
        });
    } catch (error) {
        console.error('Get all SEO settings error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch SEO settings'
        });
    }
};

// Get SEO settings for a specific page (PUBLIC - no auth required)
const getPublicSEOSettings = async (req, res) => {
    try {
        const { page } = req.params;
        
        let settings = await prisma.sEOSettings.findUnique({
            where: { page },
            select: {
                page: true,
                metaTitle: true,
                metaDescription: true,
                metaKeywords: true,
                ogImage: true
            }
        });

        if (!settings) {
            // Return default empty settings
            settings = {
                page,
                metaTitle: null,
                metaDescription: null,
                metaKeywords: null,
                ogImage: null
            };
        }

        res.json({
            success: true,
            data: settings
        });
    } catch (error) {
        console.error('Get public SEO settings error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch SEO settings'
        });
    }
};

// Get SEO settings for a specific page
const getSEOSettings = async (req, res) => {
    try {
        const { page } = req.params;
        
        let settings = await prisma.sEOSettings.findUnique({
            where: { page }
        });

        if (!settings) {
            settings = await prisma.sEOSettings.create({
                data: { page }
            });
        }

        res.json({
            success: true,
            data: settings
        });
    } catch (error) {
        console.error('Get SEO settings error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch SEO settings'
        });
    }
};

// Update SEO settings for a specific page
const updateSEOSettings = async (req, res) => {
    try {
        const { page } = req.params;
        const {
            metaTitle,
            metaDescription,
            metaKeywords
        } = req.body;

        let ogImage = null;

        // Handle image upload if provided
        if (req.file) {
            try {
                const result = await uploadToCloudinary(req.file.buffer, {
                    folder: 'seo-images',
                    resource_type: 'image',
                    transformation: [
                        { width: 1200, height: 630, crop: 'fill' }, // Standard OG image size
                        { quality: 'auto' },
                        { format: 'auto' }
                    ]
                });
                ogImage = result.secure_url;

                // Delete old image if exists
                const existingSettings = await prisma.sEOSettings.findUnique({
                    where: { page }
                });
                
                if (existingSettings?.ogImage) {
                    try {
                        const publicId = existingSettings.ogImage.split('/').pop().split('.')[0];
                        await deleteFromCloudinary(`seo-images/${publicId}`);
                    } catch (deleteError) {
                        console.warn('Failed to delete old SEO image:', deleteError);
                    }
                }
            } catch (uploadError) {
                console.error('Image upload failed:', uploadError);
                return res.status(400).json({
                    success: false,
                    error: 'Failed to upload image'
                });
            }
        }

        const updateData = {
            metaTitle,
            metaDescription,
            metaKeywords,
            updatedBy: req.user?.id
        };

        // Only update ogImage if a new image was uploaded
        if (ogImage) {
            updateData.ogImage = ogImage;
        }

        let settings = await prisma.sEOSettings.findUnique({
            where: { page }
        });

        if (settings) {
            settings = await prisma.sEOSettings.update({
                where: { page },
                data: updateData
            });
        } else {
            settings = await prisma.sEOSettings.create({
                data: {
                    page,
                    ...updateData
                }
            });
        }

        res.json({
            success: true,
            message: 'SEO settings updated successfully',
            data: settings
        });
    } catch (error) {
        console.error('Update SEO settings error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update SEO settings'
        });
    }
};

module.exports = {
    getAllSEOSettings,
    getSEOSettings,
    getPublicSEOSettings,
    updateSEOSettings
};
