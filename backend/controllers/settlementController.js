const { prisma } = require('../config/database');

// Admin: Get all settlements
const getAllSettlements = async (req, res) => {
    try {
        const settlements = await prisma.settlement.findMany({
            orderBy: { createdAt: 'desc' },
            include: {
                vendor: true
            }
        });

        res.status(200).json({
            success: true,
            data: settlements
        });
    } catch (error) {
        console.error('Error fetching settlements:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch settlements'
        });
    }
};

// Admin: Get a single settlement by ID
const getSettlementById = async (req, res) => {
    try {
        const { id } = req.params;

        const settlement = await prisma.settlement.findUnique({
            where: { id },
            include: {
                vendor: true,
                order: true
            }
        });

        if (!settlement) {
            return res.status(404).json({
                success: false,
                error: 'Settlement not found'
            });
        }

        res.status(200).json({
            success: true,
            data: settlement
        });
    } catch (error) {
        console.error('Error fetching settlement:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch settlement'
        });
    }
};

// Admin: Update settlement status (e.g. to Paid) 
const updateSettlementStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, transactionId } = req.body;

        const settlement = await prisma.settlement.findUnique({ where: { id } });

        if (!settlement) {
            return res.status(404).json({
                success: false,
                error: 'Settlement not found'
            });
        }

        const updateData = { status };

        if (status === 'Paid') {
            updateData.paymentDate = new Date();
            if (transactionId) {
                updateData.transactionId = transactionId;
            }
        }

        const updatedSettlement = await prisma.settlement.update({
            where: { id },
            data: updateData
        });

        res.status(200).json({
            success: true,
            message: `Settlement marked as ${status}`,
            data: updatedSettlement
        });

    } catch (error) {
        console.error('Error updating settlement:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update settlement'
        });
    }
};

// Vendor: Get own settlements
const getVendorSettlements = async (req, res) => {
    try {
        const vendorId = req.user.id;

        const settlements = await prisma.settlement.findMany({
            where: { vendorId },
            orderBy: { createdAt: 'desc' },
            include: {
                order: true
            }
        });

        res.status(200).json({
            success: true,
            data: settlements
        });
    } catch (error) {
        console.error('Error fetching vendor settlements:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch vendor settlements'
        });
    }
};

module.exports = {
    getAllSettlements,
    getSettlementById,
    updateSettlementStatus,
    getVendorSettlements
};
