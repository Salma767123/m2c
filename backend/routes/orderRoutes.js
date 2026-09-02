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

// Legacy orders (placed before per-line GST was frozen on the order item) have
// no gstPercentage on their items. Backfill it from each product's current rate
// so the invoice prints the real per-item rate instead of a blended average.
// In-memory only — never persisted (the product's rate may have moved since).
async function attachItemGst(order) {
    const missing = (order?.items || []).filter((it) => it.gstPercentage == null && it.productId);
    if (missing.length === 0) return;
    const ids = [...new Set(missing.map((it) => it.productId))];
    const products = await prisma.product.findMany({
        where: { id: { in: ids } },
        select: { id: true, gstPercentage: true },
    });
    const rateById = new Map(products.map((p) => [p.id, p.gstPercentage]));
    for (const it of missing) {
        const r = rateById.get(it.productId);
        if (r != null) it.gstPercentage = r;
    }
}

// Apply base auth middleware to all routes
router.use(authenticateToken);

// ============================================
// ADMIN SHIPMENT ROUTES (/api/orders/admin/shipments/*)
// These must come BEFORE /admin/:id so "shipments" isn't treated as an ID.
// ============================================
router.get('/admin/shipments', requireAdminRole, requirePermission('vendor_to_hub:view'), adminOrderController.getAllShipmentsAdmin);
router.get('/admin/shipments/:id', requireAdminRole, requirePermission('vendor_to_hub:view'), adminOrderController.getShipmentByIdAdmin);
router.put('/admin/shipments/:id/status', requireAdminRole, requirePermission('vendor_to_hub:update_status'), adminOrderController.updateShipmentStatusAdmin);

// ============================================
// ADMIN ORDER ROUTES (/api/orders/admin/*)
// ============================================
router.get('/admin', requireAdminRole, requirePermission(['hub_to_customer:view', 'invoices:view']), adminOrderController.getAllOrdersAdmin);
router.get('/admin/:id', requireAdminRole, requirePermission(['hub_to_customer:view', 'invoices:view']), adminOrderController.getAdminOrderById);
router.put('/admin/:id/status', requireAdminRole, requirePermission('hub_to_customer:update_status'), adminOrderController.updateAdminOrderStatus);
router.put('/admin/:id/cancel', requireAdminRole, requirePermission(['hub_to_customer:update_status', 'vendor_to_hub:update_status']), adminOrderController.cancelAdminOrder);
router.post('/admin/:id/return-decision', requireAdminRole, requirePermission('hub_to_customer:update_status'), adminOrderController.decideReturn);

// Admin: Get invoice HTML for an order — part of the Billing module
router.get('/admin/:id/invoice', requireAdminRole, requirePermission(['invoices:print', 'invoices:view', 'hub_to_customer:view']), async (req, res) => {
    try {
        const { id } = req.params;
        const isObjectId = /^[0-9a-fA-F]{24}$/.test(id);
        const where = isObjectId ? { id } : { orderId: id };

        const order = await prisma.order.findUnique({ where, include: { items: ACTIVE_ITEMS_FILTER } });
        if (!order) return res.status(404).json({ success: false, error: 'Order not found' });

        // Backfill per-line GST rate for legacy orders so the invoice prints real rates.
        await attachItemGst(order);

        // Fetch company info for invoice header (logo, name, GST, etc.)
        const [company, invSettings] = await Promise.all([
            prisma.companyInfo.findFirst({
                select: { companyName: true, gstNumber: true, registeredAddress: true, state: true, country: true, companyLogo: true, companyWebsite: true }
            }),
            prisma.invoiceSettings.findFirst({ select: { invoiceLogo: true } }),
        ]);

        const html = getOrderInvoiceHTML(order, company ? {
            companyName: company.companyName,
            // Dedicated invoice logo wins; fall back to the company logo when unset.
            companyLogo: invSettings?.invoiceLogo || company.companyLogo,
            gstNumber: company.gstNumber,
            address: company.registeredAddress,
            state: company.state,
            country: company.country,
            companyWebsite: company.companyWebsite,
        } : (invSettings?.invoiceLogo ? { companyLogo: invSettings.invoiceLogo } : {}));
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
router.get('/admin-reviews', requireAdminRole, requirePermission(['vendor_to_hub:view', 'hub_to_customer:view']), adminReviewController.getAllAdminReviews);
// Shipment-based review routes (primary path for new orders)
router.get('/admin-reviews/shipment/:shipmentId', requireAdminRole, requirePermission(['vendor_to_hub:view', 'hub_to_customer:view']), adminReviewController.getAdminReviewByShipment);
router.post('/admin-reviews/shipment/:shipmentId', requireAdminRole, requirePermission(['vendor_to_hub:edit', 'hub_to_customer:edit']), adminReviewController.createOrUpdateShipmentReview);
// Order-based review routes (backward compat for legacy orders)
router.get('/admin-reviews/order/:orderId', requireAdminRole, requirePermission(['vendor_to_hub:view', 'hub_to_customer:view']), adminReviewController.getAdminReviewByOrder);
router.post('/admin-reviews/order/:orderId', requireAdminRole, requirePermission(['vendor_to_hub:edit', 'hub_to_customer:edit']), adminReviewController.createOrUpdateAdminReview);
router.delete('/admin-reviews/:id', requireAdminRole, requirePermission(['vendor_to_hub:edit', 'hub_to_customer:edit']), adminReviewController.deleteAdminReview);

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
// Pre-payment fulfilment check — the storefront calls this before opening the
// payment gateway, so a cart that createOrder would reject never gets charged.
router.post('/validate-checkout', orderController.validateCheckout);
router.get('/', orderController.getUserOrders);
router.get('/:id', orderController.getOrderById);
// Customer self-service: cancel a pre-dispatch order, or request a return after delivery.
router.post('/:id/cancel', orderController.cancelMyOrder);
router.post('/:id/return', orderController.requestReturn);

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

        const [company, invSettings] = await Promise.all([
            prisma.companyInfo.findFirst({
                select: { companyName: true, gstNumber: true, registeredAddress: true, state: true, country: true, companyLogo: true, companyWebsite: true }
            }),
            prisma.invoiceSettings.findFirst({ select: { invoiceLogo: true } }),
        ]);

        const html = getOrderInvoiceHTML(order, company ? {
            companyName: company.companyName,
            // Dedicated invoice logo wins; fall back to the company logo when unset.
            companyLogo: invSettings?.invoiceLogo || company.companyLogo,
            gstNumber: company.gstNumber,
            address: company.registeredAddress,
            state: company.state,
            country: company.country,
            companyWebsite: company.companyWebsite,
        } : (invSettings?.invoiceLogo ? { companyLogo: invSettings.invoiceLogo } : {}));
        res.setHeader('Content-Type', 'text/html');
        res.send(html);
    } catch (err) {
        console.error('Customer invoice error:', err);
        res.status(500).json({ success: false, error: 'Failed to generate invoice' });
    }
});

module.exports = router;

