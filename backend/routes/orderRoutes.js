const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const adminOrderController = require('../controllers/adminOrderController');
const vendorOrderController = require('../controllers/vendorOrderController');
const { authenticateToken, requireAdminRole, requireVendorRole } = require('../middleware/auth');

// Apply base auth middleware to all routes
router.use(authenticateToken);

// ============================================
// ADMIN ROUTES (/api/orders/admin/*)
// ============================================
router.get('/admin', requireAdminRole, adminOrderController.getAllOrdersAdmin);
router.get('/admin/:id', requireAdminRole, adminOrderController.getAdminOrderById);
router.put('/admin/:id/status', requireAdminRole, adminOrderController.updateAdminOrderStatus);

// ============================================
// VENDOR ROUTES (/api/orders/vendor/*)
// ============================================
router.get('/vendor', requireVendorRole, vendorOrderController.getVendorOrders);
router.get('/vendor/:id', requireVendorRole, vendorOrderController.getVendorOrderById);
router.put('/vendor/:id/status', requireVendorRole, vendorOrderController.updateVendorOrderStatus);

// ============================================
// CUSTOMER ROUTES (/api/orders/*)
// ============================================
// Create new order
router.post('/', orderController.createOrder);

// Get user orders (Current logged in user)
router.get('/', orderController.getUserOrders);

// Get single order (Current logged in user)
router.get('/:id', orderController.getOrderById);

module.exports = router;
