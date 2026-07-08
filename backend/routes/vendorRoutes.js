const express = require('express');
const {
  registerVendor,
  getVendorProfile,
  updateVendorProfile,
  getAllVendors,
  getVendorById,
  updateVendorById,
  approveVendor,
  rejectVendor,
  confirmRejection,
  cancelRejection,
  confirmApproval,
  cancelApproval,
  suspendVendor,
  vendorLogin,
  testVendorEmail,
  assignQc,
  verifyVendorBankDetails
} = require('../controllers/vendorController');
const { authenticateToken, requireRole, requirePermission } = require('../middleware/auth');
const { vendorUploadFields, handleUploadError } = require('../middleware/upload');
const { loginLimiter, registerLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

// Public routes
router.post('/register', registerLimiter, vendorUploadFields, handleUploadError, registerVendor);
router.post('/login', loginLimiter, vendorLogin);

// Vendor protected routes
router.get('/profile', authenticateToken, getVendorProfile);
router.put('/profile', authenticateToken, updateVendorProfile);

// Admin only routes
router.post('/admin/create', authenticateToken, requireRole('admin'), requirePermission('vendor_management:create'), vendorUploadFields, handleUploadError, registerVendor);
router.get('/all', authenticateToken, requireRole('admin'), requirePermission(['vendor_management:view', 'assign_qc_checker:view']), getAllVendors);
router.get('/:vendorId', authenticateToken, requireRole('admin'), requirePermission('vendor_management:view'), getVendorById);
router.put('/:vendorId', authenticateToken, requireRole('admin'), requirePermission('vendor_management:edit'), vendorUploadFields, handleUploadError, updateVendorById);
router.put('/:vendorId/approve', authenticateToken, requireRole('admin'), requirePermission('vendor_management:approve'), approveVendor);
router.put('/:vendorId/confirm-approval', authenticateToken, requireRole('admin'), requirePermission('vendor_management:approve'), confirmApproval);
router.put('/:vendorId/cancel-approval', authenticateToken, requireRole('admin'), requirePermission('vendor_management:approve'), cancelApproval);
router.put('/:vendorId/reject', authenticateToken, requireRole('admin'), requirePermission('vendor_management:approve'), rejectVendor);
router.put('/:vendorId/confirm-rejection', authenticateToken, requireRole('admin'), requirePermission('vendor_management:approve'), confirmRejection);
router.put('/:vendorId/cancel-rejection', authenticateToken, requireRole('admin'), requirePermission('vendor_management:approve'), cancelRejection);
router.put('/:vendorId/suspend', authenticateToken, requireRole('admin'), requirePermission('vendor_management:suspend'), suspendVendor);
router.put('/:vendorId/verify-bank', authenticateToken, requireRole('admin'), requirePermission('vendor_management:edit'), verifyVendorBankDetails);
router.post('/assign-qc', authenticateToken, requireRole('admin'), requirePermission(['assign_qc_checker:create', 'assign_qc_checker:edit']), assignQc);

// Test email endpoint (development only)
router.get('/test-email', testVendorEmail);

module.exports = router;