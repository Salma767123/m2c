const express = require('express');
const router = express.Router();
const {
  getPaymentSettings,
  updateRazorpaySettings,
  updatePayUSettings
} = require('../controllers/paymentSettingsController');
const { authenticateToken, requireRole } = require('../middleware/auth');

// All routes require authentication
router.use(authenticateToken);

// Get payment settings - accessible by admins
router.get('/', requireRole('admin'), getPaymentSettings);

// Update routes - accessible by admins
router.put('/razorpay', requireRole('admin'), updateRazorpaySettings);
router.put('/payu', requireRole('admin'), updatePayUSettings);

module.exports = router;
