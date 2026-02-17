const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Get all GST settings
const getGSTSettings = async (req, res) => {
    try {
        const settings = await prisma.gSTSetting.findMany({
            orderBy: {
                createdAt: 'desc'
            }
        });

        res.json({
            success: true,
            data: settings
        });
    } catch (error) {
        console.error('Get GST settings error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch GST settings'
        });
    }
};

// Create a new GST setting
const createGSTSetting = async (req, res) => {
    try {
        const { percentage, description, isActive } = req.body;

        // Validation
        if (percentage === undefined || percentage === null) {
            return res.status(400).json({
                success: false,
                error: 'GST Percentage is required'
            });
        }

        // Check if percentage already exists
        const existing = await prisma.gSTSetting.findUnique({
            where: { percentage: parseFloat(percentage) }
        });

        if (existing) {
            return res.status(400).json({
                success: false,
                error: 'GST Percentage already exists'
            });
        }

        const newSetting = await prisma.gSTSetting.create({
            data: {
                percentage: parseFloat(percentage),
                description,
                isActive: isActive !== undefined ? isActive : true
            }
        });

        res.status(201).json({
            success: true,
            message: 'GST Setting created successfully',
            data: newSetting
        });
    } catch (error) {
        console.error('Create GST setting error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create GST setting'
        });
    }
};

// Update a GST setting
const updateGSTSetting = async (req, res) => {
    try {
        const { id } = req.params;
        const { percentage, description, isActive } = req.body;

        const updateData = {};
        if (percentage !== undefined) updateData.percentage = parseFloat(percentage);
        if (description !== undefined) updateData.description = description;
        if (isActive !== undefined) updateData.isActive = isActive;

        const updatedSetting = await prisma.gSTSetting.update({
            where: { id },
            data: updateData
        });

        res.json({
            success: true,
            message: 'GST Setting updated successfully',
            data: updatedSetting
        });
    } catch (error) {
        console.error('Update GST setting error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update GST setting'
        });
    }
};

// Delete a GST setting
const deleteGSTSetting = async (req, res) => {
    try {
        const { id } = req.params;

        await prisma.gSTSetting.delete({
            where: { id }
        });

        res.json({
            success: true,
            message: 'GST Setting deleted successfully'
        });
    } catch (error) {
        console.error('Delete GST setting error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete GST setting'
        });
    }
};

module.exports = {
    getGSTSettings,
    createGSTSetting,
    updateGSTSetting,
    deleteGSTSetting
};
