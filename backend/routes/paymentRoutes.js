const express = require('express');
const router = express.Router();
const {
  createRazorpayOrder,
  verifyRazorpayPayment,
  createPayUHash,
  handleRazorpayWebhook
} = require('../controllers/paymentController');
const { authenticateToken } = require('../middleware/auth');

// Razorpay routes
router.post('/razorpay/create-order', authenticateToken, createRazorpayOrder);
router.post('/razorpay/verify', authenticateToken, verifyRazorpayPayment);
router.post('/razorpay/webhook', handleRazorpayWebhook);

// PayU routes
router.post('/payu/create-hash', authenticateToken, createPayUHash);

module.exports = router;
