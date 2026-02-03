const express = require('express');
const {
  createInventoryItem,
  getVendorInventory,
  getInventoryItem,
  updateInventoryItem,
  deleteInventoryItem,
  updateStock,
  getInventoryStats,
  getVendorCategories
} = require('../controllers/inventoryController');
const { authenticateToken, requireVendorRole } = require('../middleware/auth');

const router = express.Router();

// All routes require vendor authentication
router.use(authenticateToken);
router.use(requireVendorRole);

// Inventory statistics
router.get('/stats', getInventoryStats);

// Get vendor's selected categories
router.get('/categories', getVendorCategories);

// CRUD operations
router.post('/', createInventoryItem);
router.get('/', getVendorInventory);
router.get('/:id', getInventoryItem);
router.put('/:id', updateInventoryItem);
router.delete('/:id', deleteInventoryItem);

// Stock management
router.patch('/:id/stock', updateStock);

module.exports = router;