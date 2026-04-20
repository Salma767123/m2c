const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/reviewController');
const { authenticateToken, requireAdminRole, requirePermission } = require('../middleware/auth');

// Customer/user routes
router.post('/', authenticateToken, reviewController.createReview);
router.get('/product/:productId', reviewController.getProductReviews);
router.get('/check-status', authenticateToken, reviewController.checkReviewStatus);

// Admin routes
router.get('/admin/all', authenticateToken, requireAdminRole, requirePermission('view_reviews'), reviewController.getAllReviews);
router.patch('/:id/status', authenticateToken, requireAdminRole, requirePermission('moderate_reviews'), reviewController.updateReviewStatus);
router.delete('/:id', authenticateToken, requireAdminRole, requirePermission('delete_reviews'), reviewController.deleteReview);

// Export
module.exports = router;
