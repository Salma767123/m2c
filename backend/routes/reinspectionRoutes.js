const express = require('express');
const router = express.Router();
const { authenticateToken, requireAdminRole, requirePermission } = require('../middleware/auth');
const {
    getInspectionsForAdminReview,
    getAdminReviewDashboardStats,
    getInspectionAuditTrail,
    adminReviewFactoryInspection,
    adminReviewProductInspection,
} = require('../controllers/reinspectionController');

// Admin: list inspections pending review
router.get('/', authenticateToken, requireAdminRole, getInspectionsForAdminReview);

// Admin: dashboard stats
router.get('/stats', authenticateToken, requireAdminRole, getAdminReviewDashboardStats);

// Admin or QC Checker: get audit trail for an entity
router.get('/:entityType/:entityId/audit-trail', authenticateToken, getInspectionAuditTrail);

// Admin: review a factory inspection
router.post(
    '/factory/:inspectionId/review',
    authenticateToken,
    requireAdminRole,
    requirePermission(['edit_vendors']),
    adminReviewFactoryInspection
);

// Admin: review a product inspection
router.post(
    '/product/:productId/review',
    authenticateToken,
    requireAdminRole,
    requirePermission(['edit_products']),
    adminReviewProductInspection
);

module.exports = router;
