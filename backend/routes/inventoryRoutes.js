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
  getNextSku,
  getAllInventory,
  getAllInventoryStats,
  getInventoryByVendor,
  getVendorCategoriesByVendorId,
  recalculateAllStock
} = require('../controllers/inventoryController');
const { authenticateToken, requireVendorRole, requireRole, requirePermission } = require('../middleware/auth');

const router = express.Router();

// Admin routes (must come before vendor routes)
router.get('/admin/all', authenticateToken, requireRole('admin'), requirePermission('inventory:view'), getAllInventory);
router.get('/admin/stats', authenticateToken, requireRole('admin'), requirePermission('inventory:view'), getAllInventoryStats);
router.get('/admin/vendor/:vendorId', authenticateToken, requireRole('admin'), requirePermission('inventory:view'), getInventoryByVendor);
router.get('/admin/vendor/:vendorId/categories', authenticateToken, requireRole('admin'), requirePermission('inventory:view'), getVendorCategoriesByVendorId);
router.get('/admin/:id', authenticateToken, requireRole('admin'), requirePermission('inventory:view'), getInventoryItem);
router.post('/admin', authenticateToken, requireRole('admin'), requirePermission('inventory:create'), createInventoryItem);
router.put('/admin/:id', authenticateToken, requireRole('admin'), requirePermission('inventory:edit'), updateInventoryItem);
router.delete('/admin/:id', authenticateToken, requireRole('admin'), requirePermission('inventory:delete'), deleteInventoryItem);
router.get('/admin/:id/history', authenticateToken, requireRole('admin'), requirePermission('inventory:view'), getStockHistory);
router.patch('/admin/:id/stock', authenticateToken, requireRole('admin'), requirePermission('inventory:update_stock'), updateStock);
router.post('/admin/recalculate-stock', authenticateToken, requireRole('admin'), requirePermission('inventory:edit'), recalculateAllStock);

// All vendor routes require vendor authentication
router.use(authenticateToken);
router.use(requireVendorRole);

// Inventory statistics
router.get('/stats', getInventoryStats);

// Get vendor's selected categories
router.get('/categories', getVendorCategories);

// Preview next auto-generated SKU (must precede '/:id')
router.get('/next-sku', getNextSku);

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