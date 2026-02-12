const express = require('express');
const {
  createInventoryItem,
  getVendorInventory,
  getInventoryItem,
  updateInventoryItem,
  deleteInventoryItem,
  updateStock,
  getStockHistory,
  getInventoryStats,
  getVendorCategories,
  getAllInventory,
  getAllInventoryStats,
  getInventoryByVendor,
  getVendorCategoriesByVendorId
} = require('../controllers/inventoryController');
const { authenticateToken, requireVendorRole, requireRole } = require('../middleware/auth');

const router = express.Router();

// Admin routes (must come before vendor routes)
router.get('/admin/all', authenticateToken, requireRole('admin'), getAllInventory);
router.get('/admin/stats', authenticateToken, requireRole('admin'), getAllInventoryStats);
router.get('/admin/vendor/:vendorId', authenticateToken, requireRole('admin'), getInventoryByVendor);
router.get('/admin/vendor/:vendorId/categories', authenticateToken, requireRole('admin'), getVendorCategoriesByVendorId);
router.get('/admin/:id', authenticateToken, requireRole('admin'), getInventoryItem);
router.post('/admin', authenticateToken, requireRole('admin'), createInventoryItem);
router.put('/admin/:id', authenticateToken, requireRole('admin'), updateInventoryItem);
router.delete('/admin/:id', authenticateToken, requireRole('admin'), deleteInventoryItem);
router.get('/admin/:id/history', authenticateToken, requireRole('admin'), getStockHistory);
router.patch('/admin/:id/stock', authenticateToken, requireRole('admin'), updateStock);

// All vendor routes require vendor authentication
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
router.get('/:id/history', getStockHistory);

module.exports = router;