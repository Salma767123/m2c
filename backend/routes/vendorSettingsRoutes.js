const express = require('express');
const {
  // Profile Settings
  updateVendorBasicInfo,
  updateVendorOwnerInfo,
  uploadVendorLogo,
  
  // Bank Details
  getVendorBankDetails,
  upsertVendorBankDetails,
  respondBankVerification,
  
  // Document Management
  getVendorDocuments,
  uploadVendorDocument,
  deleteVendorDocument,
  
  // Password Management
  changeVendorPassword,
  
  // Preferences
  updateVendorPreferences,
  
  // Certifications
  getVendorCertifications,
  addVendorCertification,
  updateVendorCertification,
  deleteVendorCertification
} = require('../controllers/vendorSettingsController');

const { authenticateToken, requireVendorRole } = require('../middleware/auth');
const { singleFileUpload, handleUploadError } = require('../middleware/upload');

const router = express.Router();

// Middleware to ensure only vendors can access these routes
router.use(authenticateToken);
router.use(requireVendorRole);

// ============================================
// PROFILE SETTINGS ROUTES
// ============================================

// Update vendor basic information
router.put('/profile/basic', updateVendorBasicInfo);

// Update vendor owner information
router.put('/profile/owner', updateVendorOwnerInfo);

// Upload vendor logo
router.post('/profile/logo', singleFileUpload('logo'), handleUploadError, uploadVendorLogo);

// Update vendor preferences
router.put('/preferences', updateVendorPreferences);

// ============================================
// BANK DETAILS ROUTES
// ============================================

// Get vendor bank details
router.get('/bank-details', getVendorBankDetails);

// Create or update vendor bank details
router.put('/bank-details', upsertVendorBankDetails);

// Vendor confirms/denies receipt of the admin's test amount (penny-drop handshake)
router.put('/bank-details/verification-response', respondBankVerification);

// ============================================
// DOCUMENT MANAGEMENT ROUTES
// ============================================

// Get all vendor documents
router.get('/documents', getVendorDocuments);

// Upload a new document
router.post('/documents', singleFileUpload('document'), handleUploadError, uploadVendorDocument);

// Delete a document
router.delete('/documents/:documentId', deleteVendorDocument);

// ============================================
// PASSWORD MANAGEMENT ROUTES
// ============================================

// Change vendor password
router.put('/password', changeVendorPassword);

// ============================================
// CERTIFICATIONS ROUTES
// ============================================

// Get all vendor certifications
router.get('/certifications', getVendorCertifications);

// Add a new certification
router.post('/certifications', singleFileUpload('certificate'), handleUploadError, addVendorCertification);

// Update a certification
router.put('/certifications/:certificationId', singleFileUpload('certificate'), handleUploadError, updateVendorCertification);

// Delete a certification
router.delete('/certifications/:certificationId', deleteVendorCertification);

module.exports = router;