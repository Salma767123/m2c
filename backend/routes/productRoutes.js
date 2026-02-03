const express = require('express');
const {
  createProduct,
  getVendorProducts,
  getProduct,
  updateProduct,
  deleteProduct,
  getProductStats,
  getAvailableInventoryItems
} = require('../controllers/productController');
const { authenticateToken, requireVendorRole } = require('../middleware/auth');

const router = express.Router();

// All routes require vendor authentication
router.use(authenticateToken);
router.use(requireVendorRole);

// Product statistics
router.get('/stats', getProductStats);

// Get available inventory items for product creation
router.get('/available-inventory', getAvailableInventoryItems);

// CRUD operations
router.post('/', createProduct);
router.get('/', getVendorProducts);
router.get('/:id', getProduct);
router.put('/:id', updateProduct);
router.delete('/:id', deleteProduct);

module.exports = router;