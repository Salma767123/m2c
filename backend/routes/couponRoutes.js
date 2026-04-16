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
    // Free shipping offer functions
    createFreeShippingOffer,
    getFreeShippingOffers,
    getFreeShippingOffer,
    updateFreeShippingOffer,
    deleteFreeShippingOffer,
    checkFreeShipping
} = require('../controllers/couponController');
const { authenticateToken, requireAdminRole } = require('../middleware/auth');

const router = express.Router();

// Public routes (no authentication required)
router.post('/apply', applyCoupon);
router.post('/apply-free-shipping', applyFreeShippingOffer);
router.post('/check-free-shipping', checkFreeShipping);
router.get('/promotional', getPromotionalCoupons); // Public endpoint for promotional display

// Free shipping offer routes (Admin only) - MUST come before /:id route
router.post('/free-shipping', authenticateToken, requireAdminRole, createFreeShippingOffer);
router.get('/free-shipping', authenticateToken, requireAdminRole, getFreeShippingOffers);
router.get('/free-shipping/:id', authenticateToken, requireAdminRole, getFreeShippingOffer);
router.put('/free-shipping/:id', authenticateToken, requireAdminRole, updateFreeShippingOffer);
router.delete('/free-shipping/:id', authenticateToken, requireAdminRole, deleteFreeShippingOffer);

// Admin routes (require admin authentication) - /:id route MUST come after specific routes
router.post('/', authenticateToken, requireAdminRole, createCoupon);
router.get('/', authenticateToken, requireAdminRole, getCoupons);
router.get('/:id', authenticateToken, requireAdminRole, getCoupon);
router.put('/:id', authenticateToken, requireAdminRole, updateCoupon);
router.delete('/:id', authenticateToken, requireAdminRole, deleteCoupon);

module.exports = router;
