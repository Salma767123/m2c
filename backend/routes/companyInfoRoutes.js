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
router.get('/', requireRole('admin'), requirePermission('settings:view'), getCompanyInfo);

// Update routes - require manage_settings
router.put('/basic', requireRole('admin'), requirePermission('settings:edit'), updateBasicInfo);
router.put('/legal', requireRole('admin'), requirePermission('settings:edit'), updateLegalInfo);
router.put('/address', requireRole('admin'), requirePermission('settings:edit'), updateAddress);
router.put('/bank', requireRole('admin'), requirePermission('settings:edit'), updateBankDetails);
router.put('/logo', requireRole('admin'), requirePermission('settings:edit'), updateLogo);

// Vendor notification email settings (Super Admin only — checked inside controller)
router.get('/vendor-notifications', requireRole('admin'), requirePermission('settings:view'), getVendorNotificationSettings);
router.put('/vendor-notifications', requireRole('admin'), requirePermission('settings:edit'), updateVendorNotificationSettings);

module.exports = router;
