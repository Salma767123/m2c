const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { resolveBase64InValue } = require('../config/cloudinary');
const { validateInspectionPayload } = require('../utils/inspectionValidation');

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

        // Invariant: a vendor can have at most one active inspection at a time.
        // Prevents admin double-click / rescheduling from creating duplicate
        // SCHEDULED rows, which let checkers unintentionally submit the same
        // report twice and produce duplicate COMPLETED history entries.
        const active = await prisma.inspection.findFirst({
            where: { vendorId, status: { in: ['SCHEDULED', 'IN_PROGRESS'] } },
            select: { id: true, status: true, scheduledDate: true },
        });
        if (active) {
            return res.status(409).json({
                success: false,
                error: 'An active inspection already exists for this vendor',
                message: `Complete or cancel the existing ${active.status.toLowerCase()} inspection (scheduled ${active.scheduledDate}) before scheduling a new one.`,
                activeInspectionId: active.id,
            });
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
                itemsToInspect: await resolveBase64InValue(itemsToInspect, { folder: 'inspections' }),
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

        const page = Math.max(parseInt(req.query.page) || 1, 1);
        const limit = Math.min(Math.max(parseInt(req.query.limit) || 12, 1), 50);
        const search = (req.query.search || '').trim().slice(0, 100);
        const result = req.query.result || '';
        const ALLOWED_SORT_FIELDS = ['scheduledDate', 'completedAt', 'createdAt', 'vendorName'];
        const sortBy = ALLOWED_SORT_FIELDS.includes(req.query.sortBy) ? req.query.sortBy : 'completedAt';
        const sortOrder = req.query.sortOrder === 'asc' ? 'asc' : 'desc';
        const ALLOWED_STATUSES = ['COMPLETED', 'SCHEDULED', 'IN_PROGRESS', 'CANCELLED'];
        const status = ALLOWED_STATUSES.includes(req.query.status) ? req.query.status : '';

        const where = { checkerId };

        // If status filter is provided use it, otherwise default to COMPLETED for reports
        if (status) {
            where.status = status;
        } else {
            where.status = 'COMPLETED';
        }

        if (result === 'PASSED' || result === 'FAILED') {
            where.result = result;
        }

        if (search) {
            where.OR = [
                { vendor: { companyName: { contains: search, mode: 'insensitive' } } },
                { clientName: { contains: search, mode: 'insensitive' } },
                { notes: { contains: search, mode: 'insensitive' } },
            ];
        }

        const [inspections, total] = await Promise.all([
            prisma.inspection.findMany({
                where,
                include: {
                    vendor: {
                        select: {
                            id: true,
                            vendorCode: true,
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
                orderBy: sortBy === 'vendorName'
                    ? { vendor: { companyName: sortOrder } }
                    : { [sortBy]: sortOrder },
                skip: (page - 1) * limit,
                take: limit,
            }),
            prisma.inspection.count({ where }),
        ]);

        res.json({
            success: true,
            inspections,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        });
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

        // Return 200 with null inspection if none found (not a 404 - it's a valid "not yet assigned" state)
        res.json({ success: true, inspection: inspection || null });
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
                itemsToInspect: await resolveBase64InValue(itemsToInspect, { folder: 'inspections' })
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
        const checkerId = req.user?.checkerId || req.user?.id || req.userId;
        const formData = req.body;

        const inspection = await prisma.inspection.findUnique({ where: { id } });

        if (!inspection) {
            return res.status(404).json({ error: 'Inspection not found' });
        }

        if (inspection.checkerId !== checkerId) {
            return res.status(403).json({ error: 'Unauthorized to complete this inspection' });
        }

        if (inspection.status === 'COMPLETED') {
            return res.status(400).json({ error: 'Inspection is already completed' });
        }

        if (inspection.status === 'CANCELLED') {
            return res.status(400).json({ error: 'Cannot complete a cancelled inspection' });
        }

        // Defence-in-depth: validate the payload server-side. The UI blocks this
        // already, but direct API calls or stale frontends could bypass it.
        const validationErrors = validateInspectionPayload(formData);
        if (Object.keys(validationErrors).length > 0) {
            return res.status(400).json({
                error: 'Validation failed',
                message: 'Some required fields are missing or invalid.',
                fieldErrors: validationErrors,
            });
        }

        const mapStatusToResult = (formStatus) => {
            switch (formStatus) {
                case 'Approved': return 'PASSED';
                case 'Rejected': return 'FAILED';
                default: return 'PASSED';
            }
        };

        const resultStatus = formData.inspectionStatus ? mapStatusToResult(formData.inspectionStatus) : 'PASSED';

        // Convert any inline base64 data URLs (factory photos / docs) to Cloudinary
        // URLs so the DB only ever stores hosted references — same pattern as
        // createInspection. Without this, completed reports balloon to MBs of base64
        // in Mongo and the admin viewer has to re-decode on every render.
        const persistedFormData = await resolveBase64InValue(formData, { folder: 'inspections' });

        const updatedInspection = await prisma.inspection.update({
            where: { id },
            data: {
                status: 'COMPLETED',
                startedAt: inspection.startedAt || new Date(),
                completedAt: new Date(),
                result: resultStatus,
                notes: formData.inspectorRemarks || '',
                itemsToInspect: persistedFormData
            },
            include: {
                vendor: true
            }
        });

        // Cascade-cancel any sibling SCHEDULED/IN_PROGRESS rows for this vendor.
        // They're now stale — keeping them would let getActiveInspectionForVendor
        // resurface them to the checker, who could submit again and create
        // duplicate COMPLETED history. Self-heals pre-existing bad data.
        await prisma.inspection.updateMany({
            where: {
                vendorId: inspection.vendorId,
                id: { not: id },
                status: { in: ['SCHEDULED', 'IN_PROGRESS'] },
            },
            data: {
                status: 'CANCELLED',
                notes: `Auto-cancelled: superseded by completed inspection ${id}`,
            },
        });

        // Also update vendor status - Keep as UNDER_REVIEW for admin approval even if QC passes
        await prisma.vendor.update({
            where: { id: inspection.vendorId },
            data: {
                status: resultStatus === 'FAILED' ? 'REJECTED' : 'UNDER_REVIEW',
            }
        });

        // If this was a product inspection, update product status
        if (inspection.productId) {
            await prisma.product.update({
                where: { id: inspection.productId },
                data: {
                    approvalStatus: resultStatus === 'FAILED' ? 'REJECTED' : 'QC_APPROVED',
                    status: 'INACTIVE', // Keep as INACTIVE until Admin finalizes with a price
                    rejectionReason: resultStatus === 'FAILED' ? 'QC inspection failed' : null
                }
            });
        }

        res.json({ success: true, message: 'Inspection completed successfully', inspection: updatedInspection });
    } catch (error) {
        console.error('Error completing inspection:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Admin: Get single inspection by ID
const getInspectionById = async (req, res) => {
    try {
        const { id } = req.params;
        const inspection = await prisma.inspection.findUnique({
            where: { id },
            include: {
                vendor: {
                    select: {
                        id: true,
                        vendorCode: true,
                        companyName: true,
                        email: true,
                        ownerName: true,
                        businessPhone: true,
                        businessCity: true,
                        businessState: true,
                        businessAddress: true,
                    }
                },
                checker: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    }
                }
            }
        });

        if (!inspection) {
            return res.status(404).json({ error: 'Inspection not found' });
        }

        res.json({ success: true, inspection });
    } catch (error) {
        console.error('Error fetching inspection by ID:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// QC Checker: Get one of their own completed inspections by ID
const getMyInspectionById = async (req, res) => {
    try {
        const { id } = req.params;
        const checkerId = req.user.id;

        const inspection = await prisma.inspection.findUnique({
            where: { id },
            include: {
                vendor: {
                    select: {
                        id: true,
                        companyName: true,
                        email: true,
                        ownerName: true,
                        businessPhone: true,
                        businessCity: true,
                        businessState: true,
                    }
                },
                checker: {
                    select: { id: true, name: true, email: true }
                }
            }
        });

        if (!inspection) {
            return res.status(404).json({ error: 'Inspection not found' });
        }

        // Only allow the assigned checker to view
        if (inspection.checkerId !== checkerId) {
            return res.status(403).json({ error: 'Access denied' });
        }

        res.json({ success: true, inspection });
    } catch (error) {
        console.error('Get My Inspection by ID error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

module.exports = {
    createInspection,
    getInspectionsByChecker,
    startInspection,
    getInspectionByVendorId,
    getInspectionById,
    getMyInspectionById,
    updateInspection,
    completeInspection
};
