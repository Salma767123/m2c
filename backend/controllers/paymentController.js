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

// Handle Razorpay Webhook
const handleRazorpayWebhook = async (req, res) => {
  try {
    const signature = req.headers['x-razorpay-signature'];

    if (!signature) {
      return res.status(400).json({
        success: false,
        error: 'Missing Razorpay signature'
      });
    }

    // Get payment settings
    const paymentSettings = await prisma.paymentSettings.findFirst();

    if (!paymentSettings || !paymentSettings.razorpayWebhookSecret) {
      console.error('Webhook received but secret not configured');
      return res.status(500).json({
        success: false,
        error: 'Webhook secret not configured'
      });
    }

    // Verify signature
    const crypto = require('crypto');
    const hmac = crypto.createHmac('sha256', paymentSettings.razorpayWebhookSecret);

    // Use rawBody if available, otherwise fallback to stringified body (less reliable)
    // Note: rawBody is captured by express.json middleware in server.js
    const verificationPayload = req.rawBody || JSON.stringify(req.body);
    hmac.update(verificationPayload);

    const expectedSignature = hmac.digest('hex');

    if (expectedSignature !== signature) {
      console.error('Webhook signature verification failed');
      console.error('Expected:', expectedSignature);
      console.error('Received:', signature);
      return res.status(400).json({
        success: false,
        error: 'Invalid signature'
      });
    }

    // Process event
    const event = req.body.event;
    const payload = req.body.payload;

    console.log('Razorpay Webhook Event:', event);

    if (event === 'payment.captured') {
      const payment = payload.payment.entity;
      const orderId = payment.order_id; // Razorpay Order ID usually starts with order_
      const paymentId = payment.id; // Razorpay Payment ID usually starts with pay_

      console.log(`Processing payment for Razorpay Order: ${orderId}, Payment ID: ${paymentId}`);

      // Try to find the order in our database.
      // We search by paymentId field which might contain the Razorpay Order ID or Payment ID.
      // Note: In current flow, Order is created AFTER payment, so this might not find anything immediately.
      // But this supports a flow where Order is created BEFORE payment.
      const order = await prisma.order.findFirst({
        where: {
          OR: [
            { paymentId: orderId },
            { paymentId: paymentId }
          ]
        }
      });

      if (order) {
        if (order.paymentStatus !== 'PAID') {
          await prisma.order.update({
            where: { id: order.id },
            data: {
              paymentStatus: 'PAID',
              // Store the actual payment ID if different
              paymentId: paymentId,
              statusHistory: {
                create: {
                  status: order.status,
                  comment: `Payment verified via Webhook. Payment ID: ${paymentId}`,
                  updatedByType: 'system'
                }
              }
            }
          });
          console.log(`Order ${order.orderId} updated to PAID via webhook`);
        } else {
          console.log(`Order ${order.orderId} is already PAID`);
        }
      } else {
        console.warn(`Order not found for Razorpay Order ID: ${orderId} or Payment ID: ${paymentId}`);
      }
    }

    res.json({ status: 'ok' });

  } catch (error) {
    console.error('Razorpay webhook error:', error);
    res.status(500).json({
      success: false,
      error: 'Webhook processing failed'
    });
  }
};

module.exports = {
  createRazorpayOrder,
  verifyRazorpayPayment,
  createPayUHash,
  handleRazorpayWebhook
};
