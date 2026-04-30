const admin = require('../config/firebase');
const { prisma } = require('../config/database');

/**
 * Reusable notification service for sending FCM push notifications.
 * Works with both mobile (checker app) and web (future) clients.
 */

// ─── Send to a single device token ──────────────────────────────────────────

async function sendToDevice(token, { title, body, data = {} }) {
  if (!token) return null;
  try {
    const result = await admin.messaging().send({
      token,
      notification: { title, body },
      data: Object.fromEntries(
        Object.entries(data).map(([k, v]) => [k, String(v)])
      ),
      android: {
        priority: 'high',
        notification: {
          sound: 'default',
          color: '#2563eb',
          priority: 'high',
          defaultVibrateTimings: true,
          defaultSound: true,
        },
      },
      apns: {
        payload: {
          aps: { sound: 'default', badge: 1 },
        },
      },
    });
    return result;
  } catch (error) {
    // Token is invalid/expired — clean it up
    if (
      error.code === 'messaging/invalid-registration-token' ||
      error.code === 'messaging/registration-token-not-registered'
    ) {
      await prisma.deviceToken.deleteMany({ where: { token } });
      console.log(`Removed invalid FCM token: ${token.slice(0, 20)}...`);
    } else {
      console.error('FCM send error:', error.message);
    }
    return null;
  }
}

// ─── Send to multiple tokens ────────────────────────────────────────────────

async function sendToTokens(tokens, { title, body, data = {} }) {
  if (!tokens || tokens.length === 0) return [];
  const results = await Promise.allSettled(
    tokens.map((token) => sendToDevice(token, { title, body, data }))
  );
  return results;
}

// ─── Send to a user by role + ID ────────────────────────────────────────────

async function sendToUser(userId, role, { title, body, data = {} }) {
  const devices = await prisma.deviceToken.findMany({
    where: { userId, role },
    select: { token: true },
  });
  if (devices.length === 0) return [];
  return sendToTokens(
    devices.map((d) => d.token),
    { title, body, data }
  );
}

// ─── Send to all users with a given role ────────────────────────────────────

async function sendToRole(role, { title, body, data = {} }) {
  const devices = await prisma.deviceToken.findMany({
    where: { role },
    select: { token: true },
  });
  if (devices.length === 0) return [];
  return sendToTokens(
    devices.map((d) => d.token),
    { title, body, data }
  );
}

// ─── Pre-built notification helpers ─────────────────────────────────────────

const notifications = {
  // QC Checker: new product assigned
  productAssigned: (checkerId, productName) =>
    sendToUser(checkerId, 'QC_CHECKER', {
      title: 'New Product Assigned',
      body: `"${productName}" has been assigned to you for inspection.`,
      data: { type: 'PRODUCT_ASSIGNED', screen: 'products' },
    }),

  // QC Checker: new vendor assigned
  vendorAssigned: (checkerId, vendorName) =>
    sendToUser(checkerId, 'QC_CHECKER', {
      title: 'New Vendor Assigned',
      body: `"${vendorName}" has been assigned to you for inspection.`,
      data: { type: 'VENDOR_ASSIGNED', screen: 'vendors' },
    }),

  // QC Checker: inspection scheduled
  inspectionScheduled: (checkerId, vendorName, date) =>
    sendToUser(checkerId, 'QC_CHECKER', {
      title: 'Inspection Scheduled',
      body: `Inspection for "${vendorName}" scheduled on ${date}.`,
      data: { type: 'INSPECTION_SCHEDULED', screen: 'vendors' },
    }),

  // Vendor: product approved
  productApproved: (vendorId, productName) =>
    sendToUser(vendorId, 'VENDOR', {
      title: 'Product Approved',
      body: `Your product "${productName}" has been approved.`,
      data: { type: 'PRODUCT_APPROVED' },
    }),

  // Vendor: product rejected
  productRejected: (vendorId, productName, reason) =>
    sendToUser(vendorId, 'VENDOR', {
      title: 'Product Rejected',
      body: `Your product "${productName}" was rejected: ${reason}`,
      data: { type: 'PRODUCT_REJECTED' },
    }),

  // Vendor: approved/rejected
  vendorStatusChanged: (vendorId, status) =>
    sendToUser(vendorId, 'VENDOR', {
      title: `Vendor ${status}`,
      body: `Your vendor application has been ${status.toLowerCase()}.`,
      data: { type: 'VENDOR_STATUS_CHANGED' },
    }),

  // Admin: inspection completed
  inspectionCompleted: (vendorName, result) =>
    sendToRole('ADMIN', {
      title: 'Inspection Completed',
      body: `Inspection for "${vendorName}" completed — Result: ${result}`,
      data: { type: 'INSPECTION_COMPLETED' },
    }),

  // ── Order status notifications (customer-facing) ──────────────────────────

  orderConfirmed: (customerId, orderId) =>
    sendToUser(customerId, 'USER', {
      title: 'Order Confirmed',
      body: `Your order #${orderId} has been confirmed and is being processed.`,
      data: { type: 'ORDER_CONFIRMED', orderId, screen: 'orders' },
    }),

  orderProcessing: (customerId, orderId) =>
    sendToUser(customerId, 'USER', {
      title: 'Order Processing',
      body: `Your order #${orderId} is being prepared for shipment.`,
      data: { type: 'ORDER_PROCESSING', orderId, screen: 'orders' },
    }),

  orderShipped: (customerId, orderId) =>
    sendToUser(customerId, 'USER', {
      title: 'Order Shipped',
      body: `Your order #${orderId} has been shipped! Track your delivery in the app.`,
      data: { type: 'ORDER_SHIPPED', orderId, screen: 'orders' },
    }),

  orderOutForDelivery: (customerId, orderId) =>
    sendToUser(customerId, 'USER', {
      title: 'Out for Delivery',
      body: `Your order #${orderId} is out for delivery. It will arrive soon!`,
      data: { type: 'ORDER_OUT_FOR_DELIVERY', orderId, screen: 'orders' },
    }),

  orderDelivered: (customerId, orderId) =>
    sendToUser(customerId, 'USER', {
      title: 'Order Delivered',
      body: `Your order #${orderId} has been delivered. Enjoy your purchase!`,
      data: { type: 'ORDER_DELIVERED', orderId, screen: 'orders' },
    }),

  orderCancelled: (customerId, orderId) =>
    sendToUser(customerId, 'USER', {
      title: 'Order Cancelled',
      body: `Your order #${orderId} has been cancelled. Refund will be processed if applicable.`,
      data: { type: 'ORDER_CANCELLED', orderId, screen: 'orders' },
    }),

  orderRefunded: (customerId, orderId) =>
    sendToUser(customerId, 'USER', {
      title: 'Refund Processed',
      body: `Refund for order #${orderId} has been processed. Please allow 5-7 business days.`,
      data: { type: 'ORDER_REFUNDED', orderId, screen: 'orders' },
    }),

  // Vendor: new order received
  orderReceived: (vendorId, orderId, itemCount, total) =>
    sendToUser(vendorId, 'VENDOR', {
      title: 'New Order Received',
      body: `Order #${orderId} — ${itemCount} items, ₹${total}`,
      data: { type: 'ORDER_RECEIVED', orderId },
    }),
};

module.exports = {
  sendToDevice,
  sendToTokens,
  sendToUser,
  sendToRole,
  notifications,
};
