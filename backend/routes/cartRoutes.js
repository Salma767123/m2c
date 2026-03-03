const express = require('express');
const {
  addToCart,
  getCart,
  updateCartItem,
  removeFromCart,
  clearCart
} = require('../controllers/cartController');
const { authenticateToken, optionalAuth } = require('../middleware/auth');

const router = express.Router();

// Optional auth for GET cart (so unauthenticated header doesn't 401)
// Add/update routes can still handle this inside controller or use authenticateToken separately
router.use(optionalAuth);

// Cart routes
router.post('/add', authenticateToken, addToCart);
router.get('/', getCart);
router.put('/:itemId', authenticateToken, updateCartItem);
router.delete('/:itemId', authenticateToken, removeFromCart);
router.delete('/clear/all', authenticateToken, clearCart);

module.exports = router;
