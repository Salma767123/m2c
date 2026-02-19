const { prisma } = require('../config/database');

// Get all hubs
const getHubs = async (req, res) => {
    try {
        const hubs = await prisma.hub.findMany({
            orderBy: {
                createdAt: 'desc'
            }
        });

        res.json({
            success: true,
            data: hubs
        });
    } catch (error) {
        console.error('Get hubs error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch hubs'
        });
    }
};

// Get single hub by ID
const getHubById = async (req, res) => {
    try {
        const { id } = req.params;

        const hub = await prisma.hub.findUnique({
            where: { id }
        });

        if (!hub) {
            return res.status(404).json({
                success: false,
                error: 'Hub not found'
            });
        }

        res.json({
            success: true,
            data: hub
        });
    } catch (error) {
        console.error('Get hub error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch hub'
        });
    }
};

// Create new hub
const createHub = async (req, res) => {
    try {
        const { name, address, city, state, zipCode, phone, email, isActive } = req.body;

        // Validation
        if (!name || !city || !state) {
            return res.status(400).json({
                success: false,
                error: 'Hub name, city, and state are required'
            });
        }

        const hub = await prisma.hub.create({
            data: {
                name,
                address: address || '',
                city,
                state,
                zipCode: zipCode || '',
                phone: phone || '',
                email: email || '',
                isActive: isActive !== undefined ? isActive : true
            }
        });

        res.status(201).json({
            success: true,
            message: 'Hub created successfully',
            data: hub
        });
    } catch (error) {
        console.error('Create hub error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create hub'
        });
    }
};

// Update existing hub
const updateHub = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, address, city, state, zipCode, phone, email, isActive } = req.body;

        // Check if hub exists
        const existingHub = await prisma.hub.findUnique({
            where: { id }
        });

        if (!existingHub) {
            return res.status(404).json({
                success: false,
                error: 'Hub not found'
            });
        }

        // Validation
        if (!name || !city || !state) {
            return res.status(400).json({
                success: false,
                error: 'Hub name, city, and state are required'
            });
        }

        const hub = await prisma.hub.update({
            where: { id },
            data: {
                name,
                address: address || '',
                city,
                state,
                zipCode: zipCode || '',
                phone: phone || '',
                email: email || '',
                isActive: isActive !== undefined ? isActive : existingHub.isActive
            }
        });

        res.json({
            success: true,
            message: 'Hub updated successfully',
            data: hub
        });
    } catch (error) {
        console.error('Update hub error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update hub'
        });
    }
};

// Delete hub
const deleteHub = async (req, res) => {
    try {
        const { id } = req.params;

        // Check if hub exists
        const existingHub = await prisma.hub.findUnique({
            where: { id }
        });

        if (!existingHub) {
            return res.status(404).json({
                success: false,
                error: 'Hub not found'
            });
        }

        await prisma.hub.delete({
            where: { id }
        });

        res.json({
            success: true,
            message: 'Hub deleted successfully'
        });
    } catch (error) {
        console.error('Delete hub error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete hub'
        });
    }
};

// Toggle hub active status
const toggleHubStatus = async (req, res) => {
    try {
        const { id } = req.params;

        const existingHub = await prisma.hub.findUnique({
            where: { id }
        });

        if (!existingHub) {
            return res.status(404).json({
                success: false,
                error: 'Hub not found'
            });
        }

        const hub = await prisma.hub.update({
            where: { id },
            data: {
                isActive: !existingHub.isActive
            }
        });

        res.json({
            success: true,
            message: `Hub ${hub.isActive ? 'activated' : 'deactivated'} successfully`,
            data: hub
        });
    } catch (error) {
        console.error('Toggle hub status error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to toggle hub status'
        });
    }
};

module.exports = {
    getHubs,
    getHubById,
    createHub,
    updateHub,
    deleteHub,
    toggleHubStatus
};
