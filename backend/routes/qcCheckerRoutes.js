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
    getProductDetails,
    approveProductByQc,
    rejectProductByQc
} = require('../controllers/qcCheckerController');

const { authenticateToken, requireAdminRole } = require('../middleware/auth');

const router = express.Router();

// ============================================
// QC CHECKER AUTH (Public)
// ============================================
router.post('/login', qcCheckerLogin);

// ============================================
// QC CHECKER SELF ROUTES (Authenticated QC Checker)
// ============================================
router.get('/me', authenticateToken, getCheckerProfile);
router.get('/vendors', authenticateToken, getAssignedVendors);
router.get('/vendors/:vendorId/details', authenticateToken, getVendorDetails);
router.get('/vendors/:vendorId/active-inspection', authenticateToken, getActiveInspectionForVendor);
router.post('/vendors/:vendorId/approve', authenticateToken, approveVendorByQc);
router.post('/vendors/:vendorId/reject', authenticateToken, rejectVendorByQc);

// QC Products
router.get('/products', authenticateToken, getAssignedProducts);
router.get('/products/:productId/details', authenticateToken, getProductDetails);
router.post('/products/:productId/approve', authenticateToken, approveProductByQc);
router.post('/products/:productId/reject', authenticateToken, rejectProductByQc);

// ============================================
// ADMIN ROUTES (Requires Admin Auth)
// ============================================
router.post('/', authenticateToken, requireAdminRole, createQCChecker);
router.get('/', authenticateToken, requireAdminRole, getAllQCCheckers);
router.get('/:id', authenticateToken, requireAdminRole, getQCCheckerById);
router.put('/:id', authenticateToken, requireAdminRole, updateQCChecker);
router.delete('/:id', authenticateToken, requireAdminRole, deleteQCChecker);
router.post('/:id/resend-credentials', authenticateToken, requireAdminRole, resendCredentials);

module.exports = router;
