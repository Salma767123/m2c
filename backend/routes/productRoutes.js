const express = require('express');
const {
  createProduct,
  getVendorProducts,
  getProduct,
  updateProduct,
  deleteProduct,
  getProductStats,
  getAvailableInventoryItems,
  // Admin functions
  getProductForAdmin,
  createProductByAdmin,
  updateProductByAdmin,
  deleteProductByAdmin,
  approveProduct,
  rejectProduct,
  assignQCCheckerToProduct,
  getAllProductsForAdmin,
  updateVariantStocks,
  // Public functions
  getPublicProducts,
  getPublicProduct
} = require('../controllers/productController');
const { authenticateToken, requireVendorRole, requireAdminRole, requireRole } = require('../middleware/auth');

const router = express.Router();

// Public routes (no authentication required)
router.get('/public', getPublicProducts);
router.get('/public/:id', getPublicProduct);

// Admin routes (require admin authentication)
router.get('/admin/all', authenticateToken, requireAdminRole, getAllProductsForAdmin);
router.get('/admin/:id', authenticateToken, requireAdminRole, getProductForAdmin);
router.post('/admin', authenticateToken, requireAdminRole, createProductByAdmin);
router.put('/admin/:id', authenticateToken, requireAdminRole, updateProductByAdmin);
router.delete('/admin/:id', authenticateToken, requireAdminRole, deleteProductByAdmin);
router.put('/:id/approve', authenticateToken, requireAdminRole, approveProduct);
router.put('/:id/reject', authenticateToken, requireAdminRole, rejectProduct);
router.post('/admin/:id/assign-qc', authenticateToken, requireAdminRole, assignQCCheckerToProduct);
router.put('/admin/:id/variants/stock', authenticateToken, requireAdminRole, updateVariantStocks);

// Vendor routes - specific named routes MUST come before /:id
// Product statistics
router.get('/stats', authenticateToken, requireVendorRole, getProductStats);

// Get available inventory items for product creation
router.get('/available-inventory', authenticateToken, requireVendorRole, getAvailableInventoryItems);

// Vendor CRUD operations
router.post('/', authenticateToken, requireVendorRole, createProduct);
router.get('/', authenticateToken, requireVendorRole, getVendorProducts);
router.put('/:id', authenticateToken, requireVendorRole, updateProduct);
router.delete('/:id', authenticateToken, requireVendorRole, deleteProduct);

// Update variant stocks (vendors can update their own products)
router.put('/:id/variants/stock', authenticateToken, requireVendorRole, updateVariantStocks);

// Get a single product - MUST BE LAST (Admins, Vendors, and QC Checkers can view)
router.get('/:id', authenticateToken, requireRole(['ADMIN', 'VENDOR', 'QC_CHECKER']), getProduct);

module.exports = router;