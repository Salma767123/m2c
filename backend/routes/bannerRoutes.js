const express = require('express');
const router = express.Router();
const { getAllBanners, getActiveBanners, addBanner, updateBanner, deleteBanner, reorderBanners } = require('../controllers/bannerController');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { upload } = require('../middleware/upload');

// Public endpoint - Get active banners (no auth required)
router.get('/public', getActiveBanners);

// Admin endpoints
router.get('/', authenticateToken, requireRole(['super_admin', 'admin', 'ADMIN', 'Super Admin']), getAllBanners);
router.post('/', authenticateToken, requireRole(['super_admin', 'ADMIN', 'Super Admin']), upload.single('image'), addBanner);
router.put('/:id', authenticateToken, requireRole(['super_admin', 'ADMIN', 'Super Admin']), upload.single('image'), updateBanner);
router.delete('/:id', authenticateToken, requireRole(['super_admin', 'ADMIN', 'Super Admin']), deleteBanner);
router.put('/reorder/update', authenticateToken, requireRole(['super_admin', 'ADMIN', 'Super Admin']), reorderBanners);

module.exports = router;
