const express = require('express');
const {
    createQCChecker,
    getAllQCCheckers,
    getQCCheckerById,
    getCheckerAssignments,
    updateQCChecker,
    deleteQCChecker,
    resendCredentials,
    qcCheckerLogin,
    getCheckerProfile,
    getCheckerIdProof,
    getAssignedVendors,
    getVendorDetails,
    getActiveInspectionForVendor,
    beginVendorInspection,
    approveVendorByQc,
    rejectVendorByQc,
    getAssignedProducts,
    getProductReports,
    getProductDetails,
    startProductInspectionByQc,
    approveProductByQc,
    rejectProductByQc,
    updateCheckerProfile,
    sendContactTestEmail
} = require('../controllers/qcCheckerController');

const { authenticateToken, requireAdminRole, requirePermission } = require('../middleware/auth');
const { loginLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

// ============================================
// QC CHECKER AUTH (Public)
// ============================================
router.post('/login', loginLimiter, qcCheckerLogin);

// ============================================
// QC CHECKER SELF ROUTES (Authenticated QC Checker)
// ============================================
router.get('/me', authenticateToken, getCheckerProfile);
router.get('/me/id-proof', authenticateToken, getCheckerIdProof);
router.put('/me', authenticateToken, updateCheckerProfile);
router.get('/vendors', authenticateToken, getAssignedVendors);
router.get('/vendors/:vendorId/details', authenticateToken, getVendorDetails);
router.get('/vendors/:vendorId/active-inspection', authenticateToken, getActiveInspectionForVendor);
router.post('/vendors/:vendorId/begin-inspection', authenticateToken, beginVendorInspection);
router.post('/vendors/:vendorId/approve', authenticateToken, approveVendorByQc);
router.post('/vendors/:vendorId/reject', authenticateToken, rejectVendorByQc);
// Verification helper — send a test email to a vendor contact address so the
// checker can confirm it's reachable before marking the field verified.
router.post('/send-test-email', authenticateToken, sendContactTestEmail);

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
router.post('/', authenticateToken, requireAdminRole, requirePermission('qc_checker_management:create'), createQCChecker);
router.get('/', authenticateToken, requireAdminRole, requirePermission('qc_checker_management:view'), getAllQCCheckers);
router.get('/:id', authenticateToken, requireAdminRole, requirePermission('qc_checker_management:view'), getQCCheckerById);
router.get('/:id/assignments', authenticateToken, requireAdminRole, requirePermission('qc_checker_management:view'), getCheckerAssignments);
router.put('/:id', authenticateToken, requireAdminRole, requirePermission('qc_checker_management:edit'), updateQCChecker);
router.delete('/:id', authenticateToken, requireAdminRole, requirePermission('qc_checker_management:delete'), deleteQCChecker);
router.post('/:id/resend-credentials', authenticateToken, requireAdminRole, requirePermission('qc_checker_management:resend_credentials'), resendCredentials);

module.exports = router;
