const express = require('express');
const router = express.Router();
const {
  createRazorpayOrder,
  verifyRazorpayPayment,
  createPayUHash
} = require('../controllers/paymentController');
const { authenticateToken } = require('../middleware/auth');

// Razorpay routes
router.post('/razorpay/create-order', authenticateToken, createRazorpayOrder);
router.post('/razorpay/verify', authenticateToken, verifyRazorpayPayment);

// PayU routes
router.post('/payu/create-hash', authenticateToken, createPayUHash);

module.exports = router;
