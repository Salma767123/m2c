const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const adminOrderController = require('../controllers/adminOrderController');
const vendorOrderController = require('../controllers/vendorOrderController');
const adminReviewController = require('../controllers/adminReviewController');
const { authenticateToken, requireAdminRole, requireVendorRole, requirePermission } = require('../middleware/auth');
const { getOrderInvoiceHTML } = require('../utils/email/templates/orderInvoiceTemplate');
const { prisma } = require('../config/database');
const { ACTIVE_ITEMS_FILTER } = require('../utils/activeItemsFilter');

// Apply base auth middleware to all routes
router.use(authenticateToken);

// ============================================
// ADMIN SHIPMENT ROUTES (/api/orders/admin/shipments/*)
// These must come BEFORE /admin/:id so "shipments" isn't treated as an ID.
// ============================================
router.get('/admin/shipments', requireAdminRole, adminOrderController.getAllShipmentsAdmin);
router.get('/admin/shipments/:id', requireAdminRole, adminOrderController.getShipmentByIdAdmin);
router.put('/admin/shipments/:id/status', requireAdminRole, adminOrderController.updateShipmentStatusAdmin);

// ============================================
// ADMIN ORDER ROUTES (/api/orders/admin/*)
// ============================================
router.get('/admin', requireAdminRole, requirePermission('view_orders'), adminOrderController.getAllOrdersAdmin);
router.get('/admin/:id', requireAdminRole, requirePermission('view_orders'), adminOrderController.getAdminOrderById);
router.put('/admin/:id/status', requireAdminRole, requirePermission('edit_orders'), adminOrderController.updateAdminOrderStatus);

// Admin: Get invoice HTML for an order — part of the Billing module
router.get('/admin/:id/invoice', requireAdminRole, requirePermission(['view_billing', 'view_orders']), async (req, res) => {
    try {
        const { id } = req.params;
        const isObjectId = /^[0-9a-fA-F]{24}$/.test(id);
        const where = isObjectId ? { id } : { orderId: id };

        const order = await prisma.order.findUnique({ where, include: { items: ACTIVE_ITEMS_FILTER } });
        if (!order) return res.status(404).json({ success: false, error: 'Order not found' });

        // Fetch company info for invoice header (logo, name, GST, etc.)
        const company = await prisma.companyInfo.findFirst({
            select: { companyName: true, gstNumber: true, registeredAddress: true, state: true, country: true, companyLogo: true }
        });

        const html = getOrderInvoiceHTML(order, company ? {
            companyName: company.companyName,
            companyLogo: company.companyLogo,
            gstNumber: company.gstNumber,
            address: company.registeredAddress,
            state: company.state,
            country: company.country,
        } : {});
        res.setHeader('Content-Type', 'text/html');
        res.send(html);
    } catch (err) {
        console.error('Invoice generation error:', err);
        res.status(500).json({ success: false, error: 'Failed to generate invoice' });
    }
});

// ============================================
// ADMIN REVIEW ROUTES (/api/orders/admin-reviews/*)
// ============================================
router.get('/admin-reviews', requireAdminRole, requirePermission('view_orders'), adminReviewController.getAllAdminReviews);
// Shipment-based review routes (primary path for new orders)
router.get('/admin-reviews/shipment/:shipmentId', requireAdminRole, requirePermission('view_orders'), adminReviewController.getAdminReviewByShipment);
router.post('/admin-reviews/shipment/:shipmentId', requireAdminRole, requirePermission('edit_orders'), adminReviewController.createOrUpdateShipmentReview);
// Order-based review routes (backward compat for legacy orders)
router.get('/admin-reviews/order/:orderId', requireAdminRole, requirePermission('view_orders'), adminReviewController.getAdminReviewByOrder);
router.post('/admin-reviews/order/:orderId', requireAdminRole, requirePermission('edit_orders'), adminReviewController.createOrUpdateAdminReview);
router.delete('/admin-reviews/:id', requireAdminRole, requirePermission('delete_orders'), adminReviewController.deleteAdminReview);

// ============================================
// VENDOR ROUTES (/api/orders/vendor/*)
// ============================================
router.get('/vendor', requireVendorRole, vendorOrderController.getVendorOrders);
// More-specific /vendor/reviews must be registered BEFORE /vendor/:id so Express
// doesn't treat "reviews" as an order id.
router.get('/vendor/reviews', requireVendorRole, vendorOrderController.getVendorReviews);
router.get('/vendor/:id', requireVendorRole, vendorOrderController.getVendorOrderById);
router.put('/vendor/:id/status', requireVendorRole, vendorOrderController.updateVendorOrderStatus);
router.post('/vendor/:id/reship', requireVendorRole, vendorOrderController.reshipVendorOrder);

// ============================================
// CUSTOMER ROUTES (/api/orders/*)
// ============================================
router.post('/', orderController.createOrder);
router.get('/', orderController.getUserOrders);
router.get('/:id', orderController.getOrderById);

// Customer: Download their own invoice
router.get('/:id/invoice', async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.userId;
        const isObjectId = /^[0-9a-fA-F]{24}$/.test(id);
        const where = isObjectId ? { id } : { orderId: id };

        const order = await prisma.order.findUnique({ where, include: { items: ACTIVE_ITEMS_FILTER } });
        if (!order) return res.status(404).json({ success: false, error: 'Order not found' });
        if (order.customerId !== userId) return res.status(403).json({ success: false, error: 'Unauthorized' });

        const company = await prisma.companyInfo.findFirst({
            select: { companyName: true, gstNumber: true, registeredAddress: true, state: true, country: true, companyLogo: true }
        });

        const html = getOrderInvoiceHTML(order, company ? {
            companyName: company.companyName,
            companyLogo: company.companyLogo,
            gstNumber: company.gstNumber,
            address: company.registeredAddress,
            state: company.state,
            country: company.country,
        } : {});
        res.setHeader('Content-Type', 'text/html');
        res.send(html);
    } catch (err) {
        console.error('Customer invoice error:', err);
        res.status(500).json({ success: false, error: 'Failed to generate invoice' });
    }
});

module.exports = router;

