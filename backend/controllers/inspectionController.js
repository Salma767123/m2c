const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Create an Inspection Assignment
const createInspection = async (req, res) => {
    try {
        const {
            vendorId,
            checkerId,
            poNumber, // Kept optional for backwards compatibility
            clientName,
            scheduledDate,
            scheduledTime,
            priority,
            estimatedDuration,
            itemsToInspect
        } = req.body;

        // Validate required fields
        if (!vendorId || !checkerId || !clientName || !scheduledDate || !scheduledTime || !priority || !itemsToInspect) {
            return res.status(400).json({ error: 'Missing required configuration for QC Assignment' });
        }

        // Optional validation: Ensure QC Checker exists
        const checker = await prisma.qCChecker.findUnique({ where: { id: checkerId } });
        if (!checker) {
            return res.status(404).json({ error: 'Assigned QC Checker not found' });
        }

        // Optional validation: Ensure Vendor exists
        const vendor = await prisma.vendor.findUnique({ where: { id: vendorId } });
        if (!vendor) {
            return res.status(404).json({ error: 'Vendor not found' });
        }

        const newInspection = await prisma.inspection.create({
            data: {
                vendorId,
                checkerId,
                poNumber: poNumber || "", // Set empty string if no PO number
                clientName,
                scheduledDate,
                scheduledTime,
                priority,
                estimatedDuration: estimatedDuration || '1 Hour',
                itemsToInspect, // Storing json directly
                status: 'SCHEDULED'
            }
        });

        // Also update the vendor's assignedQcId (legacy fallback / dashboard viewing ease)
        await prisma.vendor.update({
            where: { id: vendorId },
            data: { assignedQcId: checkerId, status: 'UNDER_REVIEW' }
        });

        // Optionally trigger an email to QC Checker / Vendor here

        res.status(201).json({ success: true, message: 'Inspection assigned successfully', inspection: newInspection });
    } catch (error) {
        console.error('Error creating inspection:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// QC Checker fetches their assigned Inspections
const getInspectionsByChecker = async (req, res) => {
    try {
        const checkerId = req.user.id; // From authMiddleware

        const inspections = await prisma.inspection.findMany({
            where: { checkerId },
            include: {
                vendor: {
                    select: {
                        id: true,
                        companyName: true,
                        businessCity: true,
                        businessState: true,
                        status: true,
                        email: true,
                        ownerName: true,
                        businessPhone: true
                    }
                }
            },
            orderBy: [
                { scheduledDate: 'asc' },
                { scheduledTime: 'asc' }
            ]
        });

        res.json({ success: true, inspections });
    } catch (error) {
        console.error('Error fetching QC checker inspections:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Start an Inspection
const startInspection = async (req, res) => {
    try {
        const { id } = req.params; // inspection id
        const checkerId = req.user.id; // ensuring only assigned checker can start

        const inspection = await prisma.inspection.findUnique({ where: { id } });

        if (!inspection) {
            return res.status(404).json({ error: 'Inspection not found' });
        }

        if (inspection.checkerId !== checkerId) {
            return res.status(403).json({ error: 'Unauthorized to start this inspection' });
        }

        if (inspection.status !== 'SCHEDULED') {
            return res.status(400).json({ error: `Cannot start an inspection that is currently ${inspection.status}` });
        }

        const updatedInspection = await prisma.inspection.update({
            where: { id },
            data: {
                status: 'IN_PROGRESS',
                startedAt: new Date()
            },
            include: {
                vendor: true
            }
        });

        res.json({ success: true, message: 'Inspection started', inspection: updatedInspection });
    } catch (error) {
        console.error('Error starting inspection:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Get latest inspection for a vendor (Admin)
const getInspectionByVendorId = async (req, res) => {
    try {
        const { vendorId } = req.params;
        const inspection = await prisma.inspection.findFirst({
            where: { vendorId },
            orderBy: { createdAt: 'desc' }
        });

        if (!inspection) {
            return res.status(404).json({ error: 'No inspection assignment found for this vendor' });
        }

        res.json({ success: true, inspection });
    } catch (error) {
        console.error('Error fetching vendor inspection:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Update an existing inspection assignment
const updateInspection = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            vendorId, // Optional but just in case
            checkerId,
            poNumber,
            clientName,
            scheduledDate,
            scheduledTime,
            priority,
            estimatedDuration,
            itemsToInspect
        } = req.body;

        const updatedInspection = await prisma.inspection.update({
            where: { id },
            data: {
                checkerId,
                poNumber: poNumber || "",
                clientName,
                scheduledDate,
                scheduledTime,
                priority,
                estimatedDuration,
                itemsToInspect
            }
        });

        if (checkerId) {
            await prisma.vendor.update({
                where: { id: updatedInspection.vendorId },
                data: { assignedQcId: checkerId }
            });
        }

        res.json({ success: true, message: 'Inspection updated successfully', inspection: updatedInspection });
    } catch (error) {
        console.error('Error updating inspection:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Complete an Inspection and save results
const completeInspection = async (req, res) => {
    try {
        const { id } = req.params;
        const checkerId = req.user.id;
        const formData = req.body;

        const inspection = await prisma.inspection.findUnique({ where: { id } });

        if (!inspection) {
            return res.status(404).json({ error: 'Inspection not found' });
        }

        if (inspection.checkerId !== checkerId) {
            return res.status(403).json({ error: 'Unauthorized to complete this inspection' });
        }

        const mapStatusToResult = (formStatus) => {
            switch (formStatus) {
                case 'Approved': return 'PASSED';
                case 'Conditionally Approved': return 'CONDITIONALLY_PASSED';
                case 'Rejected': return 'FAILED';
                default: return 'PASSED';
            }
        };

        const resultStatus = formData.inspectionStatus ? mapStatusToResult(formData.inspectionStatus) : 'PASSED';

        const updatedInspection = await prisma.inspection.update({
            where: { id },
            data: {
                status: 'COMPLETED',
                completedAt: new Date(),
                result: resultStatus,
                notes: formData.inspectorRemarks || '',
                // Instead of splitting properties across the schema, we save the full factory inspection form data directly to the itemsToInspect field or a new json field if we had one.
                // However, itemsToInspect is the only Json field in Inspection that we can freely write unstructured data to without schema change. 
                // We'll update itemsToInspect with the resulting formData since it's flexible and currently used to hold config/results.
                itemsToInspect: formData
            },
            include: {
                vendor: true
            }
        });

        // Also update vendor status
        await prisma.vendor.update({
            where: { id: inspection.vendorId },
            data: {
                status: resultStatus === 'PASSED' ? 'APPROVED' : (resultStatus === 'FAILED' ? 'REJECTED' : 'UNDER_REVIEW'),
                assignedQcId: null // Clear inspector once completed
            }
        });

        res.json({ success: true, message: 'Inspection completed successfully', inspection: updatedInspection });
    } catch (error) {
        console.error('Error completing inspection:', error);
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
};

module.exports = {
    createInspection,
    getInspectionsByChecker,
    startInspection,
    getInspectionByVendorId,
    updateInspection,
    completeInspection
};
