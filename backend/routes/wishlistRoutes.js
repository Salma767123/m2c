const express = require('express');
const {
  addToWishlist,
  getWishlist,
  removeFromWishlist,
  checkInWishlist,
  clearWishlist
} = require('../controllers/wishlistController');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// All wishlist routes require authentication
router.use(authenticateToken);

// Wishlist routes
router.post('/add', addToWishlist);
router.get('/', getWishlist);
router.get('/check/:productId', checkInWishlist);
router.delete('/:productId', removeFromWishlist);
router.delete('/clear/all', clearWishlist);

module.exports = router;
