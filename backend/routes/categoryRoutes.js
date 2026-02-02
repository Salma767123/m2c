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
  reorderSubcategories,
  moveSubcategory,
  getCategoryBreadcrumb,
  searchCategories,
  getCategoryTree,
  duplicateCategory
} = require('../controllers/categoryController');
const { authenticateToken, requireRole } = require('../middleware/auth');

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
router.post('/', requireRole('admin'), createCategory); // Create category
router.put('/:id', requireRole('admin'), updateCategory); // Update category
router.delete('/:id', requireRole('admin'), deleteCategory); // Delete category
router.post('/:id/duplicate', requireRole('admin'), duplicateCategory); // Duplicate category
router.patch('/bulk-status', requireRole('admin'), bulkUpdateStatus); // Bulk update status

// Subcategory management routes
router.post('/:parentId/subcategories', requireRole('admin'), createSubcategory); // Create subcategory
router.put('/:parentId/subcategories/:subcategoryId', requireRole('admin'), updateSubcategory); // Update subcategory
router.delete('/:parentId/subcategories/:subcategoryId', requireRole('admin'), deleteSubcategory); // Delete subcategory
router.patch('/:parentId/subcategories/bulk-status', requireRole('admin'), bulkUpdateSubcategoryStatus); // Bulk update subcategory status
router.patch('/:parentId/subcategories/reorder', requireRole('admin'), reorderSubcategories); // Reorder subcategories
router.patch('/:parentId/subcategories/:subcategoryId/move', requireRole('admin'), moveSubcategory); // Move subcategory to different parent

module.exports = router;