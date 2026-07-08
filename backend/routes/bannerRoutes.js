const express = require('express');
const router = express.Router();
const { getAllBanners, getActiveBanners, addBanner, updateBanner, deleteBanner, reorderBanners } = require('../controllers/bannerController');
const { authenticateToken, requireRole, requirePermission } = require('../middleware/auth');
const { upload } = require('../middleware/upload');

// Public endpoint - Get active banners (no auth required)
router.get('/public', getActiveBanners);

// Admin endpoints
router.get('/', authenticateToken, requireRole('admin'), requirePermission('settings:view'), getAllBanners);
router.post('/', authenticateToken, requireRole('admin'), requirePermission('settings:edit'), upload.single('image'), addBanner);
router.put('/:id', authenticateToken, requireRole('admin'), requirePermission('settings:edit'), upload.single('image'), updateBanner);
router.delete('/:id', authenticateToken, requireRole('admin'), requirePermission('settings:edit'), deleteBanner);
router.put('/reorder/update', authenticateToken, requireRole('admin'), requirePermission('settings:edit'), reorderBanners);

module.exports = router;
