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
    approveVendorByQc,
    rejectVendorByQc
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
router.post('/vendors/:vendorId/approve', authenticateToken, approveVendorByQc);
router.post('/vendors/:vendorId/reject', authenticateToken, rejectVendorByQc);

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
