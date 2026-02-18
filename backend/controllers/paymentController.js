const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Note: Install razorpay package: npm install razorpay
// For now, we'll create the structure. Install command needed: npm install razorpay

// Create Razorpay order
const createRazorpayOrder = async (req, res) => {
  try {
    const userId = req.userId;
    const { amount, currency = 'INR' } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid amount'
      });
    }

    // Get payment settings
    const paymentSettings = await prisma.paymentSettings.findFirst();
    
    if (!paymentSettings || !paymentSettings.razorpayEnabled) {
      return res.status(400).json({
        success: false,
        error: 'Razorpay is not enabled'
      });
    }

    if (!paymentSettings.razorpayKeyId || !paymentSettings.razorpayKeySecret) {
      return res.status(500).json({
        success: false,
        error: 'Razorpay credentials not configured'
      });
    }

    // Initialize Razorpay
    const Razorpay = require('razorpay');
    const razorpayInstance = new Razorpay({
      key_id: paymentSettings.razorpayKeyId,
      key_secret: paymentSettings.razorpayKeySecret
    });

    // Create Razorpay order
    const options = {
      amount: Math.round(amount * 100), // Amount in paise (smallest currency unit)
      currency: currency,
      receipt: `receipt_${Date.now()}`,
      notes: {
        userId: userId
      }
    };

    const razorpayOrder = await razorpayInstance.orders.create(options);

    res.json({
      success: true,
      data: {
        orderId: razorpayOrder.id,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        keyId: paymentSettings.razorpayKeyId
      }
    });

  } catch (error) {
    console.error('Create Razorpay order error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create payment order',
      details: error.message
    });
  }
};

// Verify Razorpay payment
const verifyRazorpayPayment = async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({
        success: false,
        error: 'Missing payment verification parameters'
      });
    }

    // Get payment settings
    const paymentSettings = await prisma.paymentSettings.findFirst();
    
    if (!paymentSettings || !paymentSettings.razorpayKeySecret) {
      return res.status(500).json({
        success: false,
        error: 'Payment verification failed - configuration error'
      });
    }

    // Verify signature
    const crypto = require('crypto');
    const expectedSignature = crypto
      .createHmac('sha256', paymentSettings.razorpayKeySecret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({
        success: false,
        error: 'Payment verification failed - invalid signature'
      });
    }

    // Signature is valid
    res.json({
      success: true,
      message: 'Payment verified successfully',
      data: {
        orderId: razorpay_order_id,
        paymentId: razorpay_payment_id
      }
    });

  } catch (error) {
    console.error('Verify Razorpay payment error:', error);
    res.status(500).json({
      success: false,
      error: 'Payment verification failed',
      details: error.message
    });
  }
};

// Create PayU payment hash
const createPayUHash = async (req, res) => {
  try {
    const {
      txnid,
      amount,
      productinfo,
      firstname,
      email
    } = req.body;

    if (!txnid || !amount || !productinfo || !firstname || !email) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters'
      });
    }

    // Get payment settings
    const paymentSettings = await prisma.paymentSettings.findFirst();
    
    if (!paymentSettings || !paymentSettings.payuEnabled) {
      return res.status(400).json({
        success: false,
        error: 'PayU is not enabled'
      });
    }

    if (!paymentSettings.payuMerchantKey || !paymentSettings.payuMerchantSalt) {
      return res.status(500).json({
        success: false,
        error: 'PayU credentials not configured'
      });
    }

    // Generate hash
    const crypto = require('crypto');
    const hashString = `${paymentSettings.payuMerchantKey}|${txnid}|${amount}|${productinfo}|${firstname}|${email}|||||||||||${paymentSettings.payuMerchantSalt}`;
    const hash = crypto.createHash('sha512').update(hashString).digest('hex');

    res.json({
      success: true,
      data: {
        hash: hash,
        merchantKey: paymentSettings.payuMerchantKey
      }
    });

  } catch (error) {
    console.error('Create PayU hash error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create payment hash',
      details: error.message
    });
  }
};

module.exports = {
  createRazorpayOrder,
  verifyRazorpayPayment,
  createPayUHash
};
