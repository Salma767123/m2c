const express = require('express');
const {
    createQCChecker,
    getAllQCCheckers,
    getQCCheckerById,
    updateQCChecker,
    deleteQCChecker,
    resendCredentials,
    qcCheckerLogin,
    getCheckerProfile,
    getAssignedVendors,
    getVendorDetails,
    getActiveInspectionForVendor,
    approveVendorByQc,
    rejectVendorByQc,
    getAssignedProducts,
    getProductReports,
    getProductDetails,
    startProductInspectionByQc,
    approveProductByQc,
    rejectProductByQc,
    updateCheckerProfile
} = require('../controllers/qcCheckerController');

const { authenticateToken, requireAdminRole, requirePermission } = require('../middleware/auth');

const router = express.Router();

// ============================================
// QC CHECKER AUTH (Public)
// ============================================
router.post('/login', qcCheckerLogin);

// ============================================
// QC CHECKER SELF ROUTES (Authenticated QC Checker)
// ============================================
router.get('/me', authenticateToken, getCheckerProfile);
router.put('/me', authenticateToken, updateCheckerProfile);
router.get('/vendors', authenticateToken, getAssignedVendors);
router.get('/vendors/:vendorId/details', authenticateToken, getVendorDetails);
router.get('/vendors/:vendorId/active-inspection', authenticateToken, getActiveInspectionForVendor);
router.post('/vendors/:vendorId/approve', authenticateToken, approveVendorByQc);
router.post('/vendors/:vendorId/reject', authenticateToken, rejectVendorByQc);

// QC Products
router.get('/products', authenticateToken, getAssignedProducts);
router.get('/products/reports', authenticateToken, getProductReports);
router.get('/products/:productId/details', authenticateToken, getProductDetails);
router.post('/products/:productId/start', authenticateToken, startProductInspectionByQc);
router.post('/products/:productId/approve', authenticateToken, approveProductByQc);
router.post('/products/:productId/reject', authenticateToken, rejectProductByQc);

// ============================================
// ADMIN ROUTES (Requires Admin Auth)
// ============================================
router.post('/', authenticateToken, requireAdminRole, requirePermission(['create_qc_checkers', 'create_users']), createQCChecker);
router.get('/', authenticateToken, requireAdminRole, requirePermission(['view_qc_checkers', 'view_users']), getAllQCCheckers);
router.get('/:id', authenticateToken, requireAdminRole, requirePermission(['view_qc_checkers', 'view_users']), getQCCheckerById);
router.put('/:id', authenticateToken, requireAdminRole, requirePermission(['edit_qc_checkers', 'edit_users']), updateQCChecker);
router.delete('/:id', authenticateToken, requireAdminRole, requirePermission(['delete_qc_checkers', 'delete_users']), deleteQCChecker);
router.post('/:id/resend-credentials', authenticateToken, requireAdminRole, requirePermission(['edit_qc_checkers', 'edit_users']), resendCredentials);

module.exports = router;
