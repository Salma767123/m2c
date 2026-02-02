const express = require('express');
const { 
  registerVendor,
  getVendorProfile,
  updateVendorProfile,
  getAllVendors,
  getVendorById,
  approveVendor,
  rejectVendor,
  suspendVendor,
  vendorLogin,
  testVendorEmail
} = require('../controllers/vendorController');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { vendorUploadFields, handleUploadError } = require('../middleware/upload');

const router = express.Router();

// Public routes
router.post('/register', vendorUploadFields, handleUploadError, registerVendor);
router.post('/login', vendorLogin);

// Vendor protected routes
router.get('/profile', authenticateToken, getVendorProfile);
router.put('/profile', authenticateToken, updateVendorProfile);

// Admin only routes
router.get('/all', authenticateToken, requireRole('admin'), getAllVendors);
router.get('/:vendorId', authenticateToken, requireRole('admin'), getVendorById);
router.put('/:vendorId/approve', authenticateToken, requireRole('admin'), approveVendor);
router.put('/:vendorId/reject', authenticateToken, requireRole('admin'), rejectVendor);
router.put('/:vendorId/suspend', authenticateToken, requireRole('admin'), suspendVendor);

// Test email endpoint (development only)
router.get('/test-email', testVendorEmail);

module.exports = router;