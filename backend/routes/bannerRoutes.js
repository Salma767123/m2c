const express = require('express');
const router = express.Router();
const { getAllBanners, getActiveBanners, addBanner, updateBanner, deleteBanner, reorderBanners } = require('../controllers/bannerController');
const { authenticateToken, requireRole, requirePermission } = require('../middleware/auth');
const { upload } = require('../middleware/upload');

// Public endpoint - Get active banners (no auth required)
router.get('/public', getActiveBanners);

// Admin endpoints
router.get('/', authenticateToken, requireRole('admin'), requirePermission(['view_settings', 'manage_settings']), getAllBanners);
router.post('/', authenticateToken, requireRole('admin'), requirePermission('manage_settings'), upload.single('image'), addBanner);
router.put('/:id', authenticateToken, requireRole('admin'), requirePermission('manage_settings'), upload.single('image'), updateBanner);
router.delete('/:id', authenticateToken, requireRole('admin'), requirePermission('manage_settings'), deleteBanner);
router.put('/reorder/update', authenticateToken, requireRole('admin'), requirePermission('manage_settings'), reorderBanners);

module.exports = router;
