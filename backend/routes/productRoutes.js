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

// Get a single product (Admins, Vendors, and QC Checkers can view)
router.get('/:id', authenticateToken, requireRole(['ADMIN', 'VENDOR', 'QC_CHECKER']), getProduct);

// Vendor routes (require vendor authentication)
router.use(authenticateToken);
router.use(requireVendorRole);

// Product statistics
router.get('/stats', getProductStats);

// Get available inventory items for product creation
router.get('/available-inventory', getAvailableInventoryItems);

// CRUD operations
router.post('/', createProduct);
router.get('/', getVendorProducts);
router.put('/:id', updateProduct);
router.delete('/:id', deleteProduct);

// Update variant stocks (vendors can update their own products)
router.put('/:id/variants/stock', updateVariantStocks);

module.exports = router;