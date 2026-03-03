const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/reviewController');
const { authenticateToken, requireAdminRole } = require('../middleware/auth');

// Customer/user routes
router.post('/', authenticateToken, reviewController.createReview);
router.get('/product/:productId', reviewController.getProductReviews);
router.get('/check-status', authenticateToken, reviewController.checkReviewStatus);

// Admin routes
router.get('/admin/all', authenticateToken, requireAdminRole, reviewController.getAllReviews);
router.patch('/:id/status', authenticateToken, requireAdminRole, reviewController.updateReviewStatus);
router.delete('/:id', authenticateToken, requireAdminRole, reviewController.deleteReview);

// Export
module.exports = router;
