const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { resolveBase64InValue } = require('../config/cloudinary');
const { validateAdminReviewPayload } = require('../utils/reinspectionValidation');

// ─── GET /api/reinspections ─────────────────────────────────────────────────
// List inspections pending admin review (both factory and product)
const getInspectionsForAdminReview = async (req, res) => {
    try {
        const page = Math.max(parseInt(req.query.page) || 1, 1);
        const limit = Math.min(Math.max(parseInt(req.query.limit) || 12, 1), 50);
        const type = req.query.type || 'all'; // 'factory', 'product', 'all'
        const status = req.query.status || '';
        const search = (req.query.search || '').trim().slice(0, 100);

        const results = { factory: [], product: [], pagination: {} };

        // Factory inspections (Inspection model)
        //
        // Re-inspection page shows items that need admin attention re: re-inspection:
        //   • SUBMITTED + result=FAILED  — checker rejected; admin decides finalize or re-inspect
        //   • UNDER_ADMIN_REVIEW         — admin started reviewing
        //   • REJECTED                   — previously rejected by admin, awaiting re-inspection
        //
        // SUBMITTED + result=PASSED is intentionally excluded: a PASSED submission
        // doesn't need re-inspection. Admin finalizes those via the "Approve Vendor"
        // button on the vendor detail page (see VendorInspectionDetail.tsx).
        if (type === 'all' || type === 'factory') {
            const REVIEW_STATUSES = ['SUBMITTED', 'UNDER_ADMIN_REVIEW', 'REJECTED'];

            const baseStatusFilter = (() => {
                if (status && REVIEW_STATUSES.includes(status)) {
                    return status === 'SUBMITTED'
                        ? { status: 'SUBMITTED', result: 'FAILED' }
                        : { status };
                }
                return {
                    OR: [
                        { status: 'SUBMITTED', result: 'FAILED' },
                        { status: 'UNDER_ADMIN_REVIEW' },
                        { status: 'REJECTED' },
                    ],
                };
            })();

            const factoryWhere = search
                ? {
                    AND: [
                        baseStatusFilter,
                        {
                            OR: [
                                { vendor: { companyName: { contains: search, mode: 'insensitive' } } },
                                { clientName: { contains: search, mode: 'insensitive' } },
                            ],
                        },
                    ],
                }
                : baseStatusFilter;

            const [factoryInspections, factoryTotal] = await Promise.all([
                prisma.inspection.findMany({
                    where: factoryWhere,
                    select: {
                        id: true,
                        clientName: true,
                        scheduledDate: true,
                        priority: true,
                        status: true,
                        result: true,
                        score: true,
                        notes: true,
                        cycleNumber: true,
                        parentInspectionId: true,
                        submittedAt: true,
                        completedAt: true,
                        rejectionReason: true,
                        createdAt: true,
                        vendor: { select: { id: true, companyName: true, businessCity: true, businessState: true } },
                        checker: { select: { id: true, name: true, email: true } },
                    },
                    orderBy: { updatedAt: 'desc' },
                    skip: (page - 1) * limit,
                    take: limit,
                }),
                prisma.inspection.count({ where: factoryWhere }),
            ]);

            results.factory = factoryInspections;
            results.pagination.factoryTotal = factoryTotal;
        }

        // Product inspections (Product model)
        if (type === 'all' || type === 'product') {
            const PRODUCT_REVIEW_STATUSES = ['REJECTED'];
            const productWhere = {
                approvalStatus: status && PRODUCT_REVIEW_STATUSES.includes(status)
                    ? status
                    : 'REJECTED',
                qcInspectionData: { not: null },
            };
            if (search) {
                productWhere.OR = [
                    { name: { contains: search, mode: 'insensitive' } },
                    { vendor: { companyName: { contains: search, mode: 'insensitive' } } },
                ];
            }

            const [productInspections, productTotal] = await Promise.all([
                prisma.product.findMany({
                    where: productWhere,
                    select: {
                        id: true,
                        name: true,
                        baseSku: true,
                        approvalStatus: true,
                        rejectionReason: true,
                        rejectionRemarks: true,
                        inspectionCycleNumber: true,
                        updatedAt: true,
                        createdAt: true,
                        vendor: { select: { id: true, companyName: true } },
                        assignedQc: { select: { id: true, name: true, email: true } },
                    },
                    orderBy: { updatedAt: 'desc' },
                    skip: (page - 1) * limit,
                    take: limit,
                }),
                prisma.product.count({ where: productWhere }),
            ]);

            results.product = productInspections;
            results.pagination.productTotal = productTotal;
        }

        results.pagination.page = page;
        results.pagination.limit = limit;

        res.json({ success: true, ...results });
    } catch (error) {
        console.error('Error fetching inspections for admin review:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// ─── GET /api/reinspections/stats ───────────────────────────────────────────
// Dashboard stats for admin review
const getAdminReviewDashboardStats = async (req, res) => {
    try {
        const [
            factorySubmitted,
            factoryUnderReview,
            factoryRejected,
            factoryReinspection,
            productRejected,
            productReinspection,
        ] = await Promise.all([
            // Only count FAILED submissions — PASSED ones aren't shown on the
            // re-inspection page (they go through the vendor approval gate instead).
            // Keeps this stat consistent with the table count.
            prisma.inspection.count({ where: { status: 'SUBMITTED', result: 'FAILED' } }),
            prisma.inspection.count({ where: { status: 'UNDER_ADMIN_REVIEW' } }),
            prisma.inspection.count({ where: { status: 'REJECTED' } }),
            prisma.inspection.count({ where: { status: 'REINSPECTION' } }),
            prisma.product.count({ where: { approvalStatus: 'REJECTED', qcInspectionData: { not: null } } }),
            prisma.product.count({ where: { approvalStatus: 'REINSPECTION' } }),
        ]);

        res.json({
            success: true,
            stats: {
                factory: {
                    pendingReview: factorySubmitted + factoryUnderReview,
                    submitted: factorySubmitted,
                    underReview: factoryUnderReview,
                    rejected: factoryRejected,
                    reinspection: factoryReinspection,
                },
                product: {
                    pendingReview: productRejected,
                    rejected: productRejected,
                    underReview: 0,
                    reinspection: productReinspection,
                },
                totalPendingReview: factorySubmitted + factoryUnderReview + productRejected,
            },
        });
    } catch (error) {
        console.error('Error fetching admin review stats:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// ─── GET /api/reinspections/:entityType/:entityId/audit-trail ───────────────
// Full audit trail timeline for a factory or product inspection
const getInspectionAuditTrail = async (req, res) => {
    try {
        const { entityType, entityId } = req.params;

        if (!['FACTORY_INSPECTION', 'PRODUCT_INSPECTION'].includes(entityType)) {
            return res.status(400).json({ error: 'entityType must be FACTORY_INSPECTION or PRODUCT_INSPECTION' });
        }

        const logs = await prisma.inspectionAuditLog.findMany({
            where: { entityType, entityId },
            orderBy: { createdAt: 'asc' },
        });

        // For factory inspections, also fetch the inspection chain (parent → child)
        let inspectionChain = [];
        if (entityType === 'FACTORY_INSPECTION') {
            // Find the root inspection
            let rootId = entityId;
            let current = await prisma.inspection.findUnique({
                where: { id: entityId },
                select: { parentInspectionId: true },
            });
            while (current?.parentInspectionId) {
                rootId = current.parentInspectionId;
                current = await prisma.inspection.findUnique({
                    where: { id: rootId },
                    select: { parentInspectionId: true },
                });
            }

            // Fetch all inspections in the chain
            inspectionChain = await prisma.inspection.findMany({
                where: {
                    OR: [
                        { id: rootId },
                        { parentInspectionId: rootId },
                    ],
                },
                select: {
                    id: true,
                    status: true,
                    result: true,
                    cycleNumber: true,
                    parentInspectionId: true,
                    scheduledDate: true,
                    submittedAt: true,
                    completedAt: true,
                    createdAt: true,
                    checker: { select: { id: true, name: true } },
                },
                orderBy: { cycleNumber: 'asc' },
            });

            // Also fetch audit logs for the entire chain
            if (inspectionChain.length > 1) {
                const allIds = inspectionChain.map(i => i.id);
                const allLogs = await prisma.inspectionAuditLog.findMany({
                    where: { entityType: 'FACTORY_INSPECTION', entityId: { in: allIds } },
                    orderBy: { createdAt: 'asc' },
                });
                return res.json({ success: true, logs: allLogs, inspectionChain });
            }
        }

        res.json({ success: true, logs, inspectionChain });
    } catch (error) {
        console.error('Error fetching audit trail:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// ─── POST /api/reinspections/factory/:inspectionId/review ───────────────────
// Admin reviews a submitted/rejected factory inspection
const adminReviewFactoryInspection = async (req, res) => {
    try {
        const { inspectionId } = req.params;
        const adminId = req.user.id;
        const adminName = req.user.name || req.user.email;

        const validationErrors = validateAdminReviewPayload(req.body);
        if (Object.keys(validationErrors).length > 0) {
            return res.status(400).json({ error: 'Validation failed', fieldErrors: validationErrors });
        }

        const { decision, reason, remarks, notes, newCheckerId, scheduledDate, scheduledTime } = req.body;

        const inspection = await prisma.inspection.findUnique({
            where: { id: inspectionId },
            include: {
                vendor: { select: { id: true, companyName: true } },
                checker: { select: { id: true, name: true } },
            },
        });

        if (!inspection) {
            return res.status(404).json({ error: 'Inspection not found' });
        }

        if (!['SUBMITTED', 'UNDER_ADMIN_REVIEW', 'REJECTED'].includes(inspection.status)) {
            return res.status(400).json({
                error: `Cannot review an inspection with status ${inspection.status}. Only SUBMITTED, UNDER_ADMIN_REVIEW, or REJECTED inspections can be reviewed.`,
            });
        }

        const fromStatus = inspection.status;
        const { notifications } = require('../utils/notificationService');

        if (decision === 'APPROVE') {
            // Admin approves the inspection
            await prisma.inspection.update({
                where: { id: inspectionId },
                data: {
                    status: 'COMPLETED',
                    result: 'PASSED',
                    reviewedAt: new Date(),
                    reviewedBy: adminId,
                },
            });

            await prisma.vendor.update({
                where: { id: inspection.vendorId },
                data: { status: 'UNDER_REVIEW' }, // Ready for final admin approval via existing flow
            });

            await prisma.inspectionAuditLog.create({
                data: {
                    entityType: 'FACTORY_INSPECTION',
                    entityId: inspectionId,
                    action: 'ADMIN_APPROVED',
                    fromStatus,
                    toStatus: 'COMPLETED',
                    performedById: adminId,
                    performedByType: 'ADMIN',
                    performedByName: adminName,
                    remarks: remarks || null,
                    notes: notes || null,
                    cycleNumber: inspection.cycleNumber,
                },
            });

            notifications.inspectionCompleted(inspection.vendor.companyName, 'PASSED').catch(console.error);

            // In-app notification for admins
            const { createNotificationForRole: notifyAdminsInspResult } = require('./notificationController');
            notifyAdminsInspResult({
                role: 'ADMIN', type: 'REINSPECTION_RESULT',
                title: 'Re-inspection Passed',
                message: `Factory re-inspection for "${inspection.vendor.companyName}" — Result: PASSED`,
                data: { inspectionId }
            }).catch(() => {});

            return res.json({ success: true, message: 'Factory inspection approved successfully' });
        }

        if (decision === 'FINAL_REJECT') {
            await prisma.inspection.update({
                where: { id: inspectionId },
                data: {
                    status: 'COMPLETED',
                    result: 'FAILED',
                    reviewedAt: new Date(),
                    reviewedBy: adminId,
                    rejectionReason: reason,
                    rejectionRemarks: remarks || null,
                    rejectionNotes: notes || null,
                },
            });

            await prisma.vendor.update({
                where: { id: inspection.vendorId },
                data: { status: 'REJECTED', rejectionReason: reason },
            });

            await prisma.inspectionAuditLog.create({
                data: {
                    entityType: 'FACTORY_INSPECTION',
                    entityId: inspectionId,
                    action: 'ADMIN_FINAL_REJECTED',
                    fromStatus,
                    toStatus: 'COMPLETED',
                    performedById: adminId,
                    performedByType: 'ADMIN',
                    performedByName: adminName,
                    rejectionReason: reason,
                    remarks: remarks || null,
                    notes: notes || null,
                    cycleNumber: inspection.cycleNumber,
                },
            });

            notifications.vendorStatusChanged(inspection.vendorId, 'REJECTED').catch(console.error);

            const { createNotificationForRole: notifyAdminsReject } = require('./notificationController');
            notifyAdminsReject({
                role: 'ADMIN', type: 'REINSPECTION_RESULT',
                title: 'Re-inspection Failed',
                message: `Factory re-inspection for "${inspection.vendor.companyName}" — Result: REJECTED`,
                data: { inspectionId }
            }).catch(() => {});

            return res.json({ success: true, message: 'Factory inspection finally rejected' });
        }

        if (decision === 'RAISE_REINSPECTION') {
            // Mark current inspection as completed (with FAILED result)
            await prisma.inspection.update({
                where: { id: inspectionId },
                data: {
                    status: 'COMPLETED',
                    result: 'FAILED',
                    reviewedAt: new Date(),
                    reviewedBy: adminId,
                },
            });

            // Determine the checker for re-inspection
            const reCheckerId = newCheckerId || inspection.checkerId;
            const reChecker = newCheckerId
                ? await prisma.qCChecker.findUnique({ where: { id: newCheckerId }, select: { id: true, name: true } })
                : inspection.checker;

            if (!reChecker) {
                return res.status(404).json({ error: 'Specified QC Checker not found' });
            }

            // Create new inspection for re-inspection
            const newInspection = await prisma.inspection.create({
                data: {
                    vendorId: inspection.vendorId,
                    checkerId: reCheckerId,
                    poNumber: inspection.poNumber,
                    clientName: inspection.clientName,
                    scheduledDate: scheduledDate || new Date().toISOString().split('T')[0],
                    scheduledTime: scheduledTime || '10:00 AM',
                    priority: 'high',
                    estimatedDuration: inspection.estimatedDuration,
                    itemsToInspect: inspection.itemsToInspect,
                    status: 'SCHEDULED',
                    parentInspectionId: inspectionId,
                    cycleNumber: inspection.cycleNumber + 1,
                },
            });

            // Update vendor status
            await prisma.vendor.update({
                where: { id: inspection.vendorId },
                data: { status: 'REINSPECTION', assignedQcId: reCheckerId },
            });

            // Write audit log for the re-inspection raise
            await prisma.inspectionAuditLog.create({
                data: {
                    entityType: 'FACTORY_INSPECTION',
                    entityId: inspectionId,
                    action: 'REINSPECTION_RAISED',
                    fromStatus,
                    toStatus: 'REINSPECTION',
                    performedById: adminId,
                    performedByType: 'ADMIN',
                    performedByName: adminName,
                    rejectionReason: reason || null,
                    remarks: remarks || null,
                    notes: notes || null,
                    cycleNumber: inspection.cycleNumber,
                },
            });

            // Write audit log entry for the new inspection
            await prisma.inspectionAuditLog.create({
                data: {
                    entityType: 'FACTORY_INSPECTION',
                    entityId: newInspection.id,
                    action: 'REINSPECTION_SCHEDULED',
                    fromStatus: null,
                    toStatus: 'SCHEDULED',
                    performedById: adminId,
                    performedByType: 'ADMIN',
                    performedByName: adminName,
                    remarks: `Re-inspection #${inspection.cycleNumber + 1} scheduled. Previous inspection: ${inspectionId}`,
                    cycleNumber: inspection.cycleNumber + 1,
                    parentLogId: inspectionId,
                },
            });

            // Notify the checker
            notifications.reinspectionRaised(
                reCheckerId,
                inspection.vendor.companyName,
                'factory'
            ).catch(console.error);

            // Notify vendor about re-inspection
            const { createNotification: createReinspNotif } = require('./notificationController');
            createReinspNotif({
                userId: inspection.vendorId, role: 'VENDOR', type: 'REINSPECTION_REQUIRED',
                title: 'Re-inspection Required',
                message: `Factory re-inspection #${inspection.cycleNumber + 1} has been scheduled for your company.`,
                data: { inspectionId: newInspection.id }
            }).catch(() => {});

            return res.json({
                success: true,
                message: `Re-inspection #${inspection.cycleNumber + 1} raised successfully`,
                newInspection,
            });
        }

        return res.status(400).json({ error: 'Invalid decision' });
    } catch (error) {
        console.error('Error reviewing factory inspection:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// ─── POST /api/reinspections/product/:productId/review ──────────────────────
// Admin reviews a rejected product inspection
const adminReviewProductInspection = async (req, res) => {
    try {
        const { productId } = req.params;
        const adminId = req.user.id;
        const adminName = req.user.name || req.user.email;

        const validationErrors = validateAdminReviewPayload(req.body);
        if (Object.keys(validationErrors).length > 0) {
            return res.status(400).json({ error: 'Validation failed', fieldErrors: validationErrors });
        }

        const { decision, reason, remarks, notes, newCheckerId } = req.body;

        const product = await prisma.product.findUnique({
            where: { id: productId },
            include: {
                vendor: { select: { id: true, companyName: true } },
                assignedQc: { select: { id: true, name: true } },
            },
        });

        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }

        if (product.approvalStatus !== 'REJECTED') {
            return res.status(400).json({
                error: `Cannot review a product with approval status ${product.approvalStatus}. Only REJECTED products can be reviewed.`,
            });
        }

        const fromStatus = product.approvalStatus;
        const { notifications } = require('../utils/notificationService');

        if (decision === 'APPROVE') {
            // Admin approves — set to QC_APPROVED for existing price finalization flow
            await prisma.product.update({
                where: { id: productId },
                data: {
                    approvalStatus: 'QC_APPROVED',
                    lastReviewedBy: adminId,
                    lastReviewedAt: new Date(),
                },
            });

            await prisma.inspectionAuditLog.create({
                data: {
                    entityType: 'PRODUCT_INSPECTION',
                    entityId: productId,
                    action: 'ADMIN_APPROVED',
                    fromStatus,
                    toStatus: 'QC_APPROVED',
                    performedById: adminId,
                    performedByType: 'ADMIN',
                    performedByName: adminName,
                    remarks: remarks || null,
                    notes: notes || null,
                    cycleNumber: product.inspectionCycleNumber,
                },
            });

            return res.json({ success: true, message: 'Product inspection approved' });
        }

        if (decision === 'FINAL_REJECT') {
            await prisma.product.update({
                where: { id: productId },
                data: {
                    approvalStatus: 'REJECTED',
                    status: 'INACTIVE',
                    rejectionReason: reason,
                    rejectionRemarks: remarks || null,
                    rejectionNotes: notes || null,
                    lastReviewedBy: adminId,
                    lastReviewedAt: new Date(),
                },
            });

            await prisma.inspectionAuditLog.create({
                data: {
                    entityType: 'PRODUCT_INSPECTION',
                    entityId: productId,
                    action: 'ADMIN_FINAL_REJECTED',
                    fromStatus,
                    toStatus: 'REJECTED',
                    performedById: adminId,
                    performedByType: 'ADMIN',
                    performedByName: adminName,
                    rejectionReason: reason,
                    remarks: remarks || null,
                    notes: notes || null,
                    cycleNumber: product.inspectionCycleNumber,
                    inspectionData: product.qcInspectionData || null,
                },
            });

            // Notify vendor
            if (product.vendor?.id) {
                notifications.productRejected(product.vendor.id, product.name, reason).catch(console.error);
            }

            return res.json({ success: true, message: 'Product inspection finally rejected' });
        }

        if (decision === 'RAISE_REINSPECTION') {
            // Archive current inspection data
            const previousData = product.previousInspectionData || [];
            if (product.qcInspectionData) {
                previousData.push({
                    cycleNumber: product.inspectionCycleNumber,
                    data: product.qcInspectionData,
                    rejectionReason: product.rejectionReason,
                    reviewedAt: new Date().toISOString(),
                    reviewedBy: adminName,
                });
            }

            const reCheckerId = newCheckerId || product.assignedQcId;

            await prisma.product.update({
                where: { id: productId },
                data: {
                    approvalStatus: 'REINSPECTION',
                    status: 'INACTIVE', // Keep inactive until re-inspection passes and admin approves
                    qcInspectionData: null, // Clear for fresh inspection
                    previousInspectionData: previousData,
                    inspectionCycleNumber: product.inspectionCycleNumber + 1,
                    rejectionReason: null,
                    rejectionRemarks: null,
                    rejectionNotes: null,
                    assignedQcId: reCheckerId,
                    lastReviewedBy: adminId,
                    lastReviewedAt: new Date(),
                },
            });

            await prisma.inspectionAuditLog.create({
                data: {
                    entityType: 'PRODUCT_INSPECTION',
                    entityId: productId,
                    action: 'REINSPECTION_RAISED',
                    fromStatus,
                    toStatus: 'REINSPECTION',
                    performedById: adminId,
                    performedByType: 'ADMIN',
                    performedByName: adminName,
                    rejectionReason: reason || null,
                    remarks: remarks || null,
                    notes: notes || null,
                    cycleNumber: product.inspectionCycleNumber,
                    inspectionData: product.qcInspectionData || null,
                },
            });

            // Notify the checker
            if (reCheckerId) {
                notifications.reinspectionRaised(reCheckerId, product.name, 'product').catch(console.error);
            }

            // Notify vendor about product re-inspection
            const { createNotification: createProdReinspNotif } = require('./notificationController');
            createProdReinspNotif({
                userId: product.vendorId, role: 'VENDOR', type: 'REINSPECTION_REQUIRED',
                title: 'Product Re-inspection Required',
                message: `Your product "${product.name}" requires re-inspection.${reason ? ` Reason: ${reason}` : ''}`,
                data: { productId }
            }).catch(() => {});

            return res.json({
                success: true,
                message: `Product re-inspection #${product.inspectionCycleNumber + 1} raised successfully`,
            });
        }

        return res.status(400).json({ error: 'Invalid decision' });
    } catch (error) {
        console.error('Error reviewing product inspection:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

module.exports = {
    getInspectionsForAdminReview,
    getAdminReviewDashboardStats,
    getInspectionAuditTrail,
    adminReviewFactoryInspection,
    adminReviewProductInspection,
};
