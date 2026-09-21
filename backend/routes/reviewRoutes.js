const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/reviewController');
const { authenticateToken, requireAdminRole, requirePermission } = require('../middleware/auth');

// Customer/user routes
router.post('/', authenticateToken, reviewController.createReview);
router.post('/experience', authenticateToken, reviewController.createExperienceReview);
router.get('/product/:productId', reviewController.getProductReviews);
router.get('/experience/public', reviewController.getPublicExperienceReviews);
router.get('/check-status', authenticateToken, reviewController.checkReviewStatus);
router.get('/order-eligibility', authenticateToken, reviewController.getOrderReviewEligibility);

// Admin routes — product reviews
router.get('/admin/all', authenticateToken, requireAdminRole, requirePermission('customer_reviews:view'), reviewController.getAllReviews);
// Admin routes — purchase-experience feedback
router.get('/admin/experience/all', authenticateToken, requireAdminRole, requirePermission('customer_reviews:view'), reviewController.getAllExperienceReviews);
router.patch('/experience/:id/status', authenticateToken, requireAdminRole, requirePermission('customer_reviews:approve'), reviewController.updateExperienceReviewStatus);
router.delete('/experience/:id', authenticateToken, requireAdminRole, requirePermission('customer_reviews:delete'), reviewController.deleteExperienceReview);
router.patch('/:id/status', authenticateToken, requireAdminRole, requirePermission('customer_reviews:approve'), reviewController.updateReviewStatus);
router.delete('/:id', authenticateToken, requireAdminRole, requirePermission('customer_reviews:delete'), reviewController.deleteReview);

// Export
module.exports = router;
