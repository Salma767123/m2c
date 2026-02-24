const express = require('express');
const {
  addToWishlist,
  getWishlist,
  removeFromWishlist,
  checkInWishlist,
  clearWishlist
} = require('../controllers/wishlistController');
const { authenticateToken, optionalAuth } = require('../middleware/auth');

const router = express.Router();

// Optional auth for GET wishlist (so unauthenticated header doesn't 401)
router.use(optionalAuth);

// Wishlist routes
router.post('/add', authenticateToken, addToWishlist);
router.get('/', getWishlist);
router.get('/check/:productId', checkInWishlist);
router.delete('/:productId', authenticateToken, removeFromWishlist);
router.delete('/clear/all', authenticateToken, clearWishlist);

module.exports = router;
