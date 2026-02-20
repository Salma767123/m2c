const express = require('express');
const {
    createCoupon,
    getCoupons,
    getCoupon,
    updateCoupon,
    deleteCoupon,
    applyCoupon // Public/User endpoint
} = require('../controllers/couponController');
const { authenticateToken, requireAdminRole } = require('../middleware/auth');

const router = express.Router();

// Public routes (no authentication required)
router.post('/apply', applyCoupon);

// Admin routes (require admin authentication)
router.post('/', authenticateToken, requireAdminRole, createCoupon);
router.get('/', authenticateToken, requireAdminRole, getCoupons);
router.get('/:id', authenticateToken, requireAdminRole, getCoupon);
router.put('/:id', authenticateToken, requireAdminRole, updateCoupon);
router.delete('/:id', authenticateToken, requireAdminRole, deleteCoupon);

module.exports = router;
