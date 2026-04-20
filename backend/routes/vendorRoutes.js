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
  suspendVendor,
  vendorLogin,
  testVendorEmail,
  assignQc,
  verifyVendorBankDetails
} = require('../controllers/vendorController');
const { authenticateToken, requireRole, requirePermission } = require('../middleware/auth');
const { vendorUploadFields, handleUploadError } = require('../middleware/upload');

const router = express.Router();

// Public routes
router.post('/register', vendorUploadFields, handleUploadError, registerVendor);
router.post('/login', vendorLogin);

// Vendor protected routes
router.get('/profile', authenticateToken, getVendorProfile);
router.put('/profile', authenticateToken, updateVendorProfile);

// Admin only routes
router.get('/all', authenticateToken, requireRole('admin'), requirePermission('view_vendors'), getAllVendors);
router.get('/:vendorId', authenticateToken, requireRole('admin'), requirePermission('view_vendors'), getVendorById);
router.put('/:vendorId', authenticateToken, requireRole('admin'), requirePermission('edit_vendors'), vendorUploadFields, handleUploadError, updateVendorById);
router.put('/:vendorId/approve', authenticateToken, requireRole('admin'), requirePermission('edit_vendors'), approveVendor);
router.put('/:vendorId/reject', authenticateToken, requireRole('admin'), requirePermission('edit_vendors'), rejectVendor);
router.put('/:vendorId/suspend', authenticateToken, requireRole('admin'), requirePermission('edit_vendors'), suspendVendor);
router.put('/:vendorId/verify-bank', authenticateToken, requireRole('admin'), requirePermission('edit_vendors'), verifyVendorBankDetails);
router.post('/assign-qc', authenticateToken, requireRole('admin'), requirePermission('edit_vendors'), assignQc);

// Test email endpoint (development only)
router.get('/test-email', testVendorEmail);

module.exports = router;