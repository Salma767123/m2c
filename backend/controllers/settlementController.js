const { prisma } = require('../config/database');

// Admin: Get all settlements
const getAllSettlements = async (req, res) => {
    try {
        const settlements = await prisma.settlement.findMany({
            orderBy: { createdAt: 'desc' },
            include: {
                vendor: { include: { bankDetails: { select: { id: true, bankName: true } } } },
                order: { select: { status: true, orderId: true } }
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

        const settlement = await prisma.settlement.findUnique({
            where: { id },
            include: { order: { select: { status: true, orderId: true } } }
        });

        if (!settlement) {
            return res.status(404).json({
                success: false,
                error: 'Settlement not found'
            });
        }

        // Only allow payment confirmation when order is delivered
        if (status === 'Paid') {
            const orderStatus = settlement.order?.status?.toUpperCase();
            if (orderStatus !== 'DELIVERED' && orderStatus !== 'COMPLETED') {
                return res.status(400).json({
                    success: false,
                    error: `Cannot settle payment — order ${settlement.order?.orderId || ''} is not yet delivered. Current status: ${settlement.order?.status?.replace(/_/g, ' ') || 'Unknown'}`
                });
            }

            // Check vendor has bank details
            const bankDetails = await prisma.vendorBankDetails.findUnique({
                where: { vendorId: settlement.vendorId }
            });
            if (!bankDetails) {
                return res.status(400).json({
                    success: false,
                    error: `Cannot settle payment — vendor "${settlement.vendorName}" has not added bank details yet.`
                });
            }
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

// Admin: Set or update settlement due date
const updateSettlementDueDate = async (req, res) => {
    try {
        const { id } = req.params;
        const { dueDate } = req.body;

        if (!dueDate) {
            return res.status(400).json({ success: false, error: 'Due date is required' });
        }

        const settlement = await prisma.settlement.findUnique({ where: { id } });
        if (!settlement) {
            return res.status(404).json({ success: false, error: 'Settlement not found' });
        }

        if (settlement.status === 'Paid') {
            return res.status(400).json({ success: false, error: 'Cannot update due date — settlement is already paid' });
        }

        const updatedSettlement = await prisma.settlement.update({
            where: { id },
            data: { dueDate: new Date(dueDate) }
        });

        res.status(200).json({
            success: true,
            message: 'Due date updated successfully',
            data: updatedSettlement
        });
    } catch (error) {
        console.error('Error updating settlement due date:', error);
        res.status(500).json({ success: false, error: 'Failed to update due date' });
    }
};

module.exports = {
    getAllSettlements,
    getSettlementById,
    updateSettlementStatus,
    updateSettlementDueDate,
    getVendorSettlements
};
