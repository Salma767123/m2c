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
router.post('/', requireRole('admin'), requirePermission('create_categories'), createCategory);
router.put('/:id', requireRole('admin'), requirePermission('edit_categories'), updateCategory);
router.delete('/:id', requireRole('admin'), requirePermission('delete_categories'), deleteCategory);
router.post('/:id/duplicate', requireRole('admin'), requirePermission('create_categories'), duplicateCategory);
router.patch('/bulk-status', requireRole('admin'), requirePermission('edit_categories'), bulkUpdateStatus);
router.patch('/reorder', requireRole('admin'), requirePermission('edit_categories'), reorderCategories);

// Subcategory management routes
router.post('/:parentId/subcategories', requireRole('admin'), requirePermission('create_categories'), createSubcategory);
router.put('/:parentId/subcategories/:subcategoryId', requireRole('admin'), requirePermission('edit_categories'), updateSubcategory);
router.delete('/:parentId/subcategories/:subcategoryId', requireRole('admin'), requirePermission('delete_categories'), deleteSubcategory);
router.patch('/:parentId/subcategories/bulk-status', requireRole('admin'), requirePermission('edit_categories'), bulkUpdateSubcategoryStatus);
router.patch('/:parentId/subcategories/reorder', requireRole('admin'), requirePermission('edit_categories'), reorderSubcategories);
router.patch('/:parentId/subcategories/:subcategoryId/move', requireRole('admin'), requirePermission('edit_categories'), moveSubcategory);

module.exports = router;