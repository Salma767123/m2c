const { prisma } = require('../config/database');
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
            itemsToInspect,
            parentInspectionId, // For re-inspections
            cycleNumber,        // For re-inspections
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
        // Note: SUBMITTED inspections are excluded — they're pending admin review, not active for the checker.
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
                status: 'SCHEDULED',
                parentInspectionId: parentInspectionId || null,
                cycleNumber: cycleNumber || 1,
            }
        });

        // Also update the vendor's assignedQcId (legacy fallback / dashboard viewing ease)
        await prisma.vendor.update({
            where: { id: vendorId },
            data: { assignedQcId: checkerId, status: 'UNDER_REVIEW' }
        });

        // Notify the QC checker — in-app feed + FCM push
        const vendorRecord = await prisma.vendor.findUnique({ where: { id: vendorId }, select: { companyName: true } });
        const vendorName = vendorRecord?.companyName || 'Vendor';
        const { createNotification: createInspNotif } = require('./notificationController');
        createInspNotif({
            userId: checkerId, role: 'QC_CHECKER', type: 'INSPECTION_SCHEDULED',
            title: 'Inspection Scheduled',
            message: `Inspection for "${vendorName}" scheduled on ${scheduledDate}.`,
            data: { screen: 'vendors', vendorId }
        }).catch(() => {});

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
        const ALLOWED_SORT_FIELDS = ['scheduledDate', 'completedAt', 'createdAt'];
        const sortBy = ALLOWED_SORT_FIELDS.includes(req.query.sortBy) ? req.query.sortBy : 'completedAt';
        const sortOrder = req.query.sortOrder === 'asc' ? 'asc' : 'desc';
        const ALLOWED_STATUSES = ['COMPLETED', 'SCHEDULED', 'IN_PROGRESS', 'SUBMITTED', 'UNDER_ADMIN_REVIEW', 'REJECTED', 'REINSPECTION', 'CANCELLED'];
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
                select: {
                    id: true,
                    clientName: true,
                    scheduledDate: true,
                    priority: true,
                    status: true,
                    completedAt: true,
                    result: true,
                    score: true,
                    notes: true,
                    createdAt: true,
                    updatedAt: true,
                    vendor: {
                        select: {
                            id: true,
                            companyName: true,
                        }
                    }
                },
                orderBy: { [sortBy]: sortOrder },
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

// Start an Inspection — requires checker GPS within 500m of vendor factory
const startInspection = async (req, res) => {
    try {
        const { id } = req.params; // inspection id
        const checkerId = req.user.id; // ensuring only assigned checker can start
        const { checkerLatitude, checkerLongitude } = req.body;

        const inspection = await prisma.inspection.findUnique({ where: { id } });

        if (!inspection) {
            return res.status(404).json({ error: 'Inspection not found' });
        }

        if (inspection.checkerId !== checkerId) {
            return res.status(403).json({ error: 'Unauthorized to start this inspection' });
        }

        // Both SCHEDULED (first start) and IN_PROGRESS (retry) re-verify
        // against the CURRENT vendor coordinates — so if admin updates the
        // vendor's mapLink mid-inspection, the next start call checks the
        // checker against the NEW location and refreshes the snapshot. Any
        // other status (COMPLETED, SUBMITTED…) is terminal.
        if (inspection.status !== 'SCHEDULED' && inspection.status !== 'IN_PROGRESS') {
            return res.status(400).json({ error: `Cannot start an inspection that is currently ${inspection.status}` });
        }

        // ── Location verification ──────────────────────────────────────
        if (checkerLatitude == null || checkerLongitude == null) {
            return res.status(400).json({
                error: 'Location required',
                message: 'Your current GPS location is required to start an inspection. Please enable location services and try again.',
            });
        }

        // Fetch vendor factory coordinates — ALWAYS fresh from DB so admin
        // edits to the mapLink take effect on the next start call.
        const vendor = await prisma.vendor.findUnique({
            where: { id: inspection.vendorId },
            select: { factoryLatitude: true, factoryLongitude: true, companyName: true, mapLink: true },
        });

        let vendorLat = vendor?.factoryLatitude;
        let vendorLng = vendor?.factoryLongitude;

        // If vendor doesn't have stored coordinates, try to parse from mapLink on the fly
        if ((vendorLat == null || vendorLng == null) && vendor?.mapLink) {
            const { parseMapLinkCoordinates } = require('../utils/locationUtils');
            const coords = parseMapLinkCoordinates(vendor.mapLink);
            if (coords) {
                vendorLat = coords.latitude;
                vendorLng = coords.longitude;
                // Persist for future lookups (fire-and-forget)
                prisma.vendor.update({
                    where: { id: inspection.vendorId },
                    data: { factoryLatitude: vendorLat, factoryLongitude: vendorLng },
                }).catch(e => console.error('Failed to backfill vendor coords:', e));
            }
        }

        if (vendorLat == null || vendorLng == null) {
            return res.status(400).json({
                error: 'Vendor location not set',
                message: 'The vendor\'s factory location (Map Embed Link) has not been configured. Please contact admin to set the vendor\'s map location before starting the inspection.',
            });
        }

        const { haversineDistanceMeters, LOCATION_THRESHOLD_METERS } = require('../utils/locationUtils');
        const distanceM = haversineDistanceMeters(checkerLatitude, checkerLongitude, vendorLat, vendorLng);
        const locationVerified = distanceM <= LOCATION_THRESHOLD_METERS;

        // Diagnostic — show both vendor and checker coords on every start.
        console.log(
            `[Geofence] startInspection ${id} — ${vendor?.companyName || 'vendor'} (${inspection.vendorId})\n` +
            `  vendor:  ${vendorLat}, ${vendorLng}\n` +
            `  checker: ${checkerLatitude}, ${checkerLongitude}\n` +
            `  distance: ${Math.round(distanceM)}m / ${LOCATION_THRESHOLD_METERS}m → ${locationVerified ? '✓ PASS' : '✗ MISMATCH'}`,
        );

        if (!locationVerified) {
            return res.status(403).json({
                error: 'Location mismatch',
                message: `You are approximately ${Math.round(distanceM)}m (straight-line) from the vendor's factory. You must be within ${LOCATION_THRESHOLD_METERS}m to start an inspection. Note: Google Maps may show a longer distance as it measures road/walking routes. Please travel closer to the factory location and try again.`,
                distanceMeters: Math.round(distanceM),
                thresholdMeters: LOCATION_THRESHOLD_METERS,
            });
        }

        // ── All checks passed — start (or refresh) the inspection ───────
        const wasScheduled = inspection.status === 'SCHEDULED';
        const updatedInspection = await prisma.inspection.update({
            where: { id },
            data: {
                checkerLatitude: parseFloat(checkerLatitude),
                checkerLongitude: parseFloat(checkerLongitude),
                vendorLatitude: vendorLat,
                vendorLongitude: vendorLng,
                locationVerified: true,
                locationDistanceM: Math.round(distanceM),
                // Flip status + stamp startedAt only on the very first start.
                ...(wasScheduled ? { status: 'IN_PROGRESS', startedAt: new Date() } : {}),
            },
            include: {
                vendor: true
            }
        });

        res.json({
            success: true,
            message: 'Inspection started',
            inspection: updatedInspection,
            locationVerification: {
                verified: true,
                distanceMeters: Math.round(distanceM),
                thresholdMeters: LOCATION_THRESHOLD_METERS,
            },
        });
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
// Now sets status to SUBMITTED (pending admin review) instead of COMPLETED
const completeInspection = async (req, res) => {
    try {
        const { id } = req.params;
        const checkerId = req.user?.checkerId || req.user?.id || req.userId;
        const checkerName = req.user?.name || req.user?.email || 'QC Checker';
        const formData = req.body;
        const { checkerLatitude, checkerLongitude } = req.body;

        const inspection = await prisma.inspection.findUnique({ where: { id } });

        if (!inspection) {
            return res.status(404).json({ error: 'Inspection not found' });
        }

        if (inspection.checkerId !== checkerId) {
            return res.status(403).json({ error: 'Unauthorized to complete this inspection' });
        }

        if (inspection.status === 'COMPLETED' || inspection.status === 'SUBMITTED') {
            return res.status(400).json({ error: `Inspection is already ${inspection.status.toLowerCase()}` });
        }

        if (inspection.status === 'CANCELLED') {
            return res.status(400).json({ error: 'Cannot complete a cancelled inspection' });
        }

        // ── Submit-time geofence — checker must STILL be at the vendor's factory
        //   when submitting (not just when starting). Mirrors the product flow so
        //   the location guarantee is identical for factory + product inspections.
        const vendor = await prisma.vendor.findUnique({
            where: { id: inspection.vendorId },
            select: {
                id: true,
                factoryLatitude: true,
                factoryLongitude: true,
                mapLink: true,
                companyName: true,
            },
        });
        const { verifyCheckerAtVendor } = require('../utils/locationUtils');
        const geo = await verifyCheckerAtVendor({
            vendor,
            checkerLatitude,
            checkerLongitude,
            prisma,
            label: `completeInspection ${id}`,
        });
        if (!geo.ok) {
            return res.status(geo.status).json(geo.body);
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

        const fromStatus = inspection.status;

        // Build rejection details from form data when inspection is failed
        const rejectionFields = resultStatus === 'FAILED' ? {
            rejectionReason: formData.inspectorRemarks || 'Inspection failed',
            rejectionRemarks: formData.remarks || null,
            rejectionNotes: formData.notes || null,
            locationDetails: formData.factoryAddress || formData.locationDetails || null,
        } : {};

        const updatedInspection = await prisma.inspection.update({
            where: { id },
            data: {
                status: 'SUBMITTED',
                startedAt: inspection.startedAt || new Date(),
                submittedAt: new Date(),
                // Refresh location snapshot to the SUBMIT-time GPS (overwriting
                // the start-time values) so the audit trail reflects where the
                // checker was when finalising the inspection.
                checkerLatitude: parseFloat(checkerLatitude),
                checkerLongitude: parseFloat(checkerLongitude),
                vendorLatitude: geo.vendorLat,
                vendorLongitude: geo.vendorLng,
                locationVerified: true,
                locationDistanceM: Math.round(geo.distanceM),
                result: resultStatus,
                notes: formData.inspectorRemarks || '',
                itemsToInspect: persistedFormData,
                ...rejectionFields,
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
                notes: `Auto-cancelled: superseded by submitted inspection ${id}`,
            },
        });

        // Vendor stays UNDER_REVIEW regardless of pass/fail — admin will finalize
        await prisma.vendor.update({
            where: { id: inspection.vendorId },
            data: { status: 'UNDER_REVIEW' },
        });

        // Write audit log
        await prisma.inspectionAuditLog.create({
            data: {
                entityType: 'FACTORY_INSPECTION',
                entityId: id,
                action: 'SUBMITTED',
                fromStatus,
                toStatus: 'SUBMITTED',
                performedById: checkerId,
                performedByType: 'QC_CHECKER',
                performedByName: checkerName,
                rejectionReason: resultStatus === 'FAILED' ? (formData.inspectorRemarks || 'Inspection failed') : null,
                remarks: formData.remarks || null,
                notes: formData.notes || null,
                // Verified-location stamp at submit time — mirrors the
                // product audit-log format so reports read consistently.
                locationDetails: `Verified at factory — ${Math.round(geo.distanceM)}m from vendor (checker ${Number(checkerLatitude).toFixed(6)},${Number(checkerLongitude).toFixed(6)})`,
                inspectionData: persistedFormData,
                cycleNumber: inspection.cycleNumber || 1,
            },
        });

        // Notify admins that inspection has been submitted for review
        const { notifications } = require('../utils/notificationService');
        notifications.inspectionSubmitted(
            updatedInspection.vendor?.companyName || 'Vendor',
            resultStatus
        ).catch(console.error);

        res.json({ success: true, message: 'Inspection submitted for admin review', inspection: updatedInspection });
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
