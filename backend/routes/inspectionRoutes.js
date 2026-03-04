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
const { authenticateToken, requireAdminRole } = require('../middleware/auth');

// 1. Admin creates a new inspection assignment
router.post('/assign', authenticateToken, requireAdminRole, createInspection);

// 2. QC Checker retrieves their assigned inspections
// (Assuming authenticateToken gives req.user which the controller expects)
router.get('/', authenticateToken, getInspectionsByChecker);

// 3. QC Checker starts an inspection
router.post('/:id/start', authenticateToken, startInspection);

// 3b. QC Checker completes an inspection
router.post('/:id/complete', authenticateToken, completeInspection);

// 3c. QC Checker: get one of their own inspection reports by ID
router.get('/:id/my-report', authenticateToken, getMyInspectionById);

// 4. Admin fetching an active inspection for a vendor
router.get('/vendor/:vendorId', authenticateToken, requireAdminRole, getInspectionByVendorId);

// 5. Admin updates an existing inspection
router.put('/:id', authenticateToken, requireAdminRole, updateInspection);

// 6. Admin get inspection detail by ID
router.get('/:id', authenticateToken, requireAdminRole, getInspectionById);

module.exports = router;
