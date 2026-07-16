const express = require('express');
const router = express.Router();
const {
  getAllCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
  getCategoryStats,
  bulkUpdateStatus,
  getSubcategories,
  createSubcategory,
  updateSubcategory,
  deleteSubcategory,
  getSubcategoryById,
  bulkUpdateSubcategoryStatus,
  reorderCategories,
  reorderSubcategories,
  moveSubcategory,
  getCategoryBreadcrumb,
  searchCategories,
  getCategoryTree,
  duplicateCategory,
  approvePendingCategory,
  mergePendingCategory,
  rejectPendingCategory
} = require('../controllers/categoryController');
const { authenticateToken, requireRole, requirePermission, optionalAuth } = require('../middleware/auth');

// Public routes (no authentication required).
// `optionalAuth` populates req.user when a valid token IS sent but never
// rejects anonymous callers — the controllers use it to decide visibility:
// anonymous/storefront traffic only ever sees ACTIVE categories, while an
// authenticated admin sees every status (incl. vendor-proposed PENDING ones).
router.get('/', optionalAuth, getAllCategories); // Get all categories (for frontend display)
router.get('/stats', optionalAuth, getCategoryStats); // Get category statistics
router.get('/search', optionalAuth, searchCategories); // Search categories
router.get('/tree', optionalAuth, getCategoryTree); // Get category tree structure
router.get('/:id', optionalAuth, getCategoryById); // Get single category
router.get('/:id/breadcrumb', getCategoryBreadcrumb); // Get category breadcrumb path
router.get('/:parentId/subcategories', optionalAuth, getSubcategories); // Get subcategories of a category
router.get('/:parentId/subcategories/:subcategoryId', getSubcategoryById); // Get single subcategory

// Protected routes (admin only)
router.use(authenticateToken); // All routes below require authentication

// Admin-only routes for category management
router.post('/', requireRole('admin'), requirePermission('categories:create'), createCategory);
router.put('/:id', requireRole('admin'), requirePermission('categories:edit'), updateCategory);
router.delete('/:id', requireRole('admin'), requirePermission('categories:delete'), deleteCategory);
router.post('/:id/duplicate', requireRole('admin'), requirePermission('categories:create'), duplicateCategory);
router.patch('/bulk-status', requireRole('admin'), requirePermission('categories:edit'), bulkUpdateStatus);
router.patch('/reorder', requireRole('admin'), requirePermission('categories:edit'), reorderCategories);

// Vendor-proposed (PENDING) category review — admin decides whether a custom
// category joins the live taxonomy, gets merged into an existing one, or is
// dropped. Uses categories:edit / :delete rather than a new permission so it
// slots into the existing Roles & Permissions matrix.
router.patch('/:id/approve', requireRole('admin'), requirePermission('categories:edit'), approvePendingCategory);
router.patch('/:id/merge', requireRole('admin'), requirePermission('categories:edit'), mergePendingCategory);
router.delete('/:id/reject', requireRole('admin'), requirePermission('categories:delete'), rejectPendingCategory);

// Subcategory management routes
router.post('/:parentId/subcategories', requireRole('admin'), requirePermission('categories:create'), createSubcategory);
router.put('/:parentId/subcategories/:subcategoryId', requireRole('admin'), requirePermission('categories:edit'), updateSubcategory);
router.delete('/:parentId/subcategories/:subcategoryId', requireRole('admin'), requirePermission('categories:delete'), deleteSubcategory);
router.patch('/:parentId/subcategories/bulk-status', requireRole('admin'), requirePermission('categories:edit'), bulkUpdateSubcategoryStatus);
router.patch('/:parentId/subcategories/reorder', requireRole('admin'), requirePermission('categories:edit'), reorderSubcategories);
router.patch('/:parentId/subcategories/:subcategoryId/move', requireRole('admin'), requirePermission('categories:edit'), moveSubcategory);

module.exports = router;