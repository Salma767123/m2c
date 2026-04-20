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
const { authenticateToken, requireVendorRole, requireRole, requirePermission } = require('../middleware/auth');

const router = express.Router();

// Admin routes (must come before vendor routes)
router.get('/admin/all', authenticateToken, requireRole('admin'), requirePermission('view_inventory'), getAllInventory);
router.get('/admin/stats', authenticateToken, requireRole('admin'), requirePermission('view_inventory'), getAllInventoryStats);
router.get('/admin/vendor/:vendorId', authenticateToken, requireRole('admin'), requirePermission('view_inventory'), getInventoryByVendor);
router.get('/admin/vendor/:vendorId/categories', authenticateToken, requireRole('admin'), requirePermission('view_inventory'), getVendorCategoriesByVendorId);
router.get('/admin/:id', authenticateToken, requireRole('admin'), requirePermission('view_inventory'), getInventoryItem);
router.post('/admin', authenticateToken, requireRole('admin'), requirePermission('create_inventory'), createInventoryItem);
router.put('/admin/:id', authenticateToken, requireRole('admin'), requirePermission('edit_inventory'), updateInventoryItem);
router.delete('/admin/:id', authenticateToken, requireRole('admin'), requirePermission('delete_inventory'), deleteInventoryItem);
router.get('/admin/:id/history', authenticateToken, requireRole('admin'), requirePermission('view_inventory'), getStockHistory);
router.patch('/admin/:id/stock', authenticateToken, requireRole('admin'), requirePermission('edit_inventory'), updateStock);

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