const express = require('express');
const router = express.Router();
const {
  getPaymentSettings,
  getPublicPaymentSettings,
  updateRazorpaySettings,
  updatePayUSettings
} = require('../controllers/paymentSettingsController');
const { authenticateToken, requireRole, requirePermission } = require('../middleware/auth');

// Public route - no authentication required
router.get('/public', getPublicPaymentSettings);

// All other routes require authentication
router.use(authenticateToken);

// Get payment settings — view_settings or manage_settings
router.get('/', requireRole('admin'), requirePermission('settings:view'), getPaymentSettings);

// Mutating routes — manage_settings only
router.put('/razorpay', requireRole('admin'), requirePermission('settings:edit'), updateRazorpaySettings);
router.put('/payu', requireRole('admin'), requirePermission('settings:edit'), updatePayUSettings);

module.exports = router;
