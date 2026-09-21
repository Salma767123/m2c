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
  getPublicProductFacets,
  getPublicProductSuggestions,
  getPublicProduct
} = require('../controllers/productController');
const { authenticateToken, requireVendorRole, requireAdminRole, requireRole, requirePermission } = require('../middleware/auth');

const router = express.Router();

// Public routes (no authentication required)
router.get('/public', getPublicProducts);
router.get('/public/facets', getPublicProductFacets);
router.get('/public/suggest', getPublicProductSuggestions);
router.get('/public/:id', getPublicProduct);

// Admin routes (require admin authentication + per-action permission)
router.get('/admin/all', authenticateToken, requireAdminRole, requirePermission(['all_products:view', 'vendor_product_requests:view']), getAllProductsForAdmin);
router.get('/admin/:id', authenticateToken, requireAdminRole, requirePermission(['all_products:view', 'vendor_product_requests:view']), getProductForAdmin);
router.post('/admin', authenticateToken, requireAdminRole, requirePermission('all_products:create'), createProductByAdmin);
router.put('/admin/:id', authenticateToken, requireAdminRole, requirePermission('all_products:edit'), updateProductByAdmin);
router.delete('/admin/:id', authenticateToken, requireAdminRole, requirePermission('all_products:delete'), deleteProductByAdmin);
router.put('/:id/approve', authenticateToken, requireAdminRole, requirePermission(['vendor_product_requests:approve', 'all_products:approve']), approveProduct);
router.put('/:id/reject', authenticateToken, requireAdminRole, requirePermission(['vendor_product_requests:approve', 'all_products:approve']), rejectProduct);
router.post('/admin/:id/assign-qc', authenticateToken, requireAdminRole, requirePermission('vendor_product_requests:assign_qc'), assignQCCheckerToProduct);
router.put('/admin/:id/variants/stock', authenticateToken, requireAdminRole, requirePermission('all_products:edit'), updateVariantStocks);

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