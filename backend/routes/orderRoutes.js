const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const adminOrderController = require('../controllers/adminOrderController');
const vendorOrderController = require('../controllers/vendorOrderController');
const adminReviewController = require('../controllers/adminReviewController');
const { authenticateToken, requireAdminRole, requireVendorRole } = require('../middleware/auth');
const { getOrderInvoiceHTML } = require('../utils/email/templates/orderInvoiceTemplate');
const { prisma } = require('../config/database');

// Apply base auth middleware to all routes
router.use(authenticateToken);

// ============================================
// ADMIN ROUTES (/api/orders/admin/*)
// ============================================
router.get('/admin', requireAdminRole, adminOrderController.getAllOrdersAdmin);
router.get('/admin/:id', requireAdminRole, adminOrderController.getAdminOrderById);
router.put('/admin/:id/status', requireAdminRole, adminOrderController.updateAdminOrderStatus);

// Admin: Get invoice HTML for an order
router.get('/admin/:id/invoice', requireAdminRole, async (req, res) => {
    try {
        const { id } = req.params;
        const isObjectId = /^[0-9a-fA-F]{24}$/.test(id);
        const where = isObjectId ? { id } : { orderId: id };

        const order = await prisma.order.findUnique({ where, include: { items: true } });
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
router.get('/admin-reviews', requireAdminRole, adminReviewController.getAllAdminReviews);
router.get('/admin-reviews/order/:orderId', requireAdminRole, adminReviewController.getAdminReviewByOrder);
router.post('/admin-reviews/order/:orderId', requireAdminRole, adminReviewController.createOrUpdateAdminReview);
router.delete('/admin-reviews/:id', requireAdminRole, adminReviewController.deleteAdminReview);

// ============================================
// VENDOR ROUTES (/api/orders/vendor/*)
// ============================================
router.get('/vendor', requireVendorRole, vendorOrderController.getVendorOrders);
// More-specific /vendor/reviews must be registered BEFORE /vendor/:id so Express
// doesn't treat "reviews" as an order id.
router.get('/vendor/reviews', requireVendorRole, vendorOrderController.getVendorReviews);
router.get('/vendor/:id', requireVendorRole, vendorOrderController.getVendorOrderById);
router.put('/vendor/:id/status', requireVendorRole, vendorOrderController.updateVendorOrderStatus);

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

        const order = await prisma.order.findUnique({ where, include: { items: true } });
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

