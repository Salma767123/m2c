const express = require('express');
const router = express.Router();

const {
  authenticateToken,
  requireAdminRole,
  requireVendorRole,
  requirePermission,
} = require('../middleware/auth');

const {
  adminProposePrice,
  vendorRespond,
  adminRespond,
  getProductNegotiations,
  listNegotiations,
} = require('../controllers/priceNegotiationController');

// Everything here needs a logged-in principal.
router.use(authenticateToken);

// ── Admin ───────────────────────────────────────────────────────────────────
// Reuses the existing product-approval permission: whoever may approve a
// product's price may negotiate it. No new permission key to seed.
const canApproveProducts = requirePermission([
  'vendor_product_requests:approve',
  'all_products:approve',
]);

/** Admin opens a negotiation or counters the vendor's offer. */
router.post('/admin/product/:productId/propose', requireAdminRole, canApproveProducts, adminProposePrice);

/** Admin accepts / rejects / counters the vendor's open offer. */
router.post('/admin/product/:productId/respond', requireAdminRole, canApproveProducts, adminRespond);

// ── Vendor ──────────────────────────────────────────────────────────────────
/** Vendor accepts / rejects / counters the admin's open offer. */
router.post('/vendor/product/:productId/respond', requireVendorRole, vendorRespond);

// ── Shared reads ────────────────────────────────────────────────────────────
// Both sides read the same shapes; the controller scopes vendors to their own
// rows and 403s a vendor reading someone else's product.
router.get('/product/:productId', getProductNegotiations);
router.get('/', listNegotiations);

module.exports = router;
