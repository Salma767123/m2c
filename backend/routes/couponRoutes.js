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
router.post('/free-shipping', authenticateToken, requireAdminRole, requirePermission('coupons:create'), createFreeShippingOffer);
router.get('/free-shipping', authenticateToken, requireAdminRole, requirePermission('coupons:view'), getFreeShippingOffers);
router.get('/free-shipping/:id', authenticateToken, requireAdminRole, requirePermission('coupons:view'), getFreeShippingOffer);
router.put('/free-shipping/:id', authenticateToken, requireAdminRole, requirePermission('coupons:edit'), updateFreeShippingOffer);
router.delete('/free-shipping/:id', authenticateToken, requireAdminRole, requirePermission('coupons:delete'), deleteFreeShippingOffer);

// Admin routes (require admin authentication) - /:id route MUST come after specific routes
router.post('/', authenticateToken, requireAdminRole, requirePermission('coupons:create'), createCoupon);
router.get('/', authenticateToken, requireAdminRole, requirePermission('coupons:view'), getCoupons);
router.get('/:id', authenticateToken, requireAdminRole, requirePermission('coupons:view'), getCoupon);
router.put('/:id', authenticateToken, requireAdminRole, requirePermission('coupons:edit'), updateCoupon);
router.delete('/:id', authenticateToken, requireAdminRole, requirePermission('coupons:delete'), deleteCoupon);

module.exports = router;
