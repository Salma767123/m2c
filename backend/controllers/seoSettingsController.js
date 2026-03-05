const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Get SEO settings
const getSEOSettings = async (req, res) => {
    try {
        let settings = await prisma.sEOSettings.findFirst();

        if (!settings) {
            settings = await prisma.sEOSettings.create({
                data: {}
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

// Update SEO settings
const updateSEOSettings = async (req, res) => {
    try {
        const {
            metaTitle,
            metaDescription,
            metaKeywords,
            ogTitle,
            ogDescription,
            ogImage,
            twitterCard,
            twitterTitle,
            twitterDescription,
            twitterImage,
            googleAnalyticsId,
            facebookPixelId,
            robotsTxt,
            sitemapUrl
        } = req.body;

        let settings = await prisma.sEOSettings.findFirst();

        const updateData = {
            metaTitle,
            metaDescription,
            metaKeywords,
            ogTitle,
            ogDescription,
            ogImage,
            twitterCard,
            twitterTitle,
            twitterDescription,
            twitterImage,
            googleAnalyticsId,
            facebookPixelId,
            robotsTxt,
            sitemapUrl,
            updatedBy: req.user?.id
        };

        if (settings) {
            settings = await prisma.sEOSettings.update({
                where: { id: settings.id },
                data: updateData
            });
        } else {
            settings = await prisma.sEOSettings.create({
                data: updateData
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
    getSEOSettings,
    updateSEOSettings
};
