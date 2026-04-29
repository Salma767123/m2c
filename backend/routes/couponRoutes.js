const express = require('express');
const {
    createCoupon,
    getCoupons,
    getCoupon,
    updateCoupon,
    deleteCoupon,
    applyCoupon, // Public/User endpoint
    applyFreeShippingOffer, // Public/User endpoint for free shipping
    getPromotionalCoupons, // Public endpoint for promotional display
    getPopupCoupons, // Public endpoint for category/product popup modals
    // Free shipping offer functions
    createFreeShippingOffer,
    getFreeShippingOffers,
    getFreeShippingOffer,
    updateFreeShippingOffer,
    deleteFreeShippingOffer,
    checkFreeShipping
} = require('../controllers/couponController');
const { authenticateToken, requireAdminRole, requirePermission } = require('../middleware/auth');

const router = express.Router();

// Public routes (no authentication required)
router.post('/apply', applyCoupon);
router.post('/apply-free-shipping', applyFreeShippingOffer);
router.post('/check-free-shipping', checkFreeShipping);
router.get('/promotional', getPromotionalCoupons); // Public endpoint for promotional display
router.get('/popup', getPopupCoupons); // Public endpoint for category/product popup modals

// Free shipping offer routes (Admin only) - MUST come before /:id route
router.post('/free-shipping', authenticateToken, requireAdminRole, requirePermission('create_coupons'), createFreeShippingOffer);
router.get('/free-shipping', authenticateToken, requireAdminRole, requirePermission('view_coupons'), getFreeShippingOffers);
router.get('/free-shipping/:id', authenticateToken, requireAdminRole, requirePermission('view_coupons'), getFreeShippingOffer);
router.put('/free-shipping/:id', authenticateToken, requireAdminRole, requirePermission('edit_coupons'), updateFreeShippingOffer);
router.delete('/free-shipping/:id', authenticateToken, requireAdminRole, requirePermission('delete_coupons'), deleteFreeShippingOffer);

// Admin routes (require admin authentication) - /:id route MUST come after specific routes
router.post('/', authenticateToken, requireAdminRole, requirePermission('create_coupons'), createCoupon);
router.get('/', authenticateToken, requireAdminRole, requirePermission('view_coupons'), getCoupons);
router.get('/:id', authenticateToken, requireAdminRole, requirePermission('view_coupons'), getCoupon);
router.put('/:id', authenticateToken, requireAdminRole, requirePermission('edit_coupons'), updateCoupon);
router.delete('/:id', authenticateToken, requireAdminRole, requirePermission('delete_coupons'), deleteCoupon);

module.exports = router;
