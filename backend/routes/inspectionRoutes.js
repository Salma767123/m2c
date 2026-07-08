const express = require('express');
const router = express.Router();
const {
    createInspection,
    getInspectionsByChecker,
    startInspection,
    getInspectionByVendorId,
    getInspectionById,
    getMyInspectionById,
    updateInspection,
    completeInspection
} = require('../controllers/inspectionController');

// Import the standard auth middleware used across the app
const { authenticateToken, requireAdminRole, requirePermission } = require('../middleware/auth');

// 1. Admin creates a new inspection assignment (assigning QC checker to a vendor)
router.post('/assign', authenticateToken, requireAdminRole, requirePermission(['assign_qc_checker:create', 'assign_qc_checker:edit']), createInspection);

// 2. QC Checker retrieves their assigned inspections
router.get('/', authenticateToken, getInspectionsByChecker);

// 3. QC Checker starts an inspection
router.post('/:id/start', authenticateToken, startInspection);

// 3b. QC Checker completes an inspection
router.post('/:id/complete', authenticateToken, completeInspection);

// 3c. QC Checker: get one of their own inspection reports by ID
router.get('/:id/my-report', authenticateToken, getMyInspectionById);

// 4. Admin fetching an active inspection for a vendor
router.get('/vendor/:vendorId', authenticateToken, requireAdminRole, requirePermission(['assign_qc_checker:view', 'vendor_management:view', 'qc_reports:view']), getInspectionByVendorId);

// 5. Admin updates an existing inspection
router.put('/:id', authenticateToken, requireAdminRole, requirePermission('assign_qc_checker:edit'), updateInspection);

// 6. Admin get inspection detail by ID (also accessible from QC Reports)
router.get('/:id', authenticateToken, requireAdminRole, requirePermission(['assign_qc_checker:view', 'vendor_management:view', 'qc_reports:view', 'reinspection_review:view']), getInspectionById);

module.exports = router;
