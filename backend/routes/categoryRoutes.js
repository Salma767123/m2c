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
  duplicateCategory
} = require('../controllers/categoryController');
const { authenticateToken, requireRole, requirePermission } = require('../middleware/auth');

// Public routes (no authentication required)
router.get('/', getAllCategories); // Get all categories (for frontend display)
router.get('/stats', getCategoryStats); // Get category statistics
router.get('/search', searchCategories); // Search categories
router.get('/tree', getCategoryTree); // Get category tree structure
router.get('/:id', getCategoryById); // Get single category
router.get('/:id/breadcrumb', getCategoryBreadcrumb); // Get category breadcrumb path
router.get('/:parentId/subcategories', getSubcategories); // Get subcategories of a category
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

// Subcategory management routes
router.post('/:parentId/subcategories', requireRole('admin'), requirePermission('categories:create'), createSubcategory);
router.put('/:parentId/subcategories/:subcategoryId', requireRole('admin'), requirePermission('categories:edit'), updateSubcategory);
router.delete('/:parentId/subcategories/:subcategoryId', requireRole('admin'), requirePermission('categories:delete'), deleteSubcategory);
router.patch('/:parentId/subcategories/bulk-status', requireRole('admin'), requirePermission('categories:edit'), bulkUpdateSubcategoryStatus);
router.patch('/:parentId/subcategories/reorder', requireRole('admin'), requirePermission('categories:edit'), reorderSubcategories);
router.patch('/:parentId/subcategories/:subcategoryId/move', requireRole('admin'), requirePermission('categories:edit'), moveSubcategory);

module.exports = router;