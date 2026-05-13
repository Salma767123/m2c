const express = require('express');
const router = express.Router();
const {
  getCompanyInfo,
  getPublicCompanyInfo,
  updateBasicInfo,
  updateLegalInfo,
  updateAddress,
  updateBankDetails,
  updateLogo,
  getVendorNotificationSettings,
  updateVendorNotificationSettings
} = require('../controllers/companyInfoController');
const { authenticateToken, requireRole, requirePermission } = require('../middleware/auth');

// Public route (no auth required)
router.get('/public', getPublicCompanyInfo);

// All routes below require authentication
router.use(authenticateToken);

// Get company info - accessible by anyone with view_settings or manage_settings
router.get('/', requireRole('admin'), requirePermission(['view_settings', 'manage_settings']), getCompanyInfo);

// Update routes - require manage_settings
router.put('/basic', requireRole('admin'), requirePermission('manage_settings'), updateBasicInfo);
router.put('/legal', requireRole('admin'), requirePermission('manage_settings'), updateLegalInfo);
router.put('/address', requireRole('admin'), requirePermission('manage_settings'), updateAddress);
router.put('/bank', requireRole('admin'), requirePermission('manage_settings'), updateBankDetails);
router.put('/logo', requireRole('admin'), requirePermission('manage_settings'), updateLogo);

// Vendor notification email settings (Super Admin only — checked inside controller)
router.get('/vendor-notifications', requireRole('admin'), requirePermission('manage_settings'), getVendorNotificationSettings);
router.put('/vendor-notifications', requireRole('admin'), requirePermission('manage_settings'), updateVendorNotificationSettings);

module.exports = router;
