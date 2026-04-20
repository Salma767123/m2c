const express = require('express');
const router = express.Router();
const { getAllSEOSettings, getSEOSettings, getPublicSEOSettings, updateSEOSettings } = require('../controllers/seoSettingsController');
const { authenticateToken, requireRole, requirePermission } = require('../middleware/auth');
const { upload } = require('../middleware/upload');

// Public endpoint - Get SEO settings for a specific page (no auth required)
router.get('/public/:page', getPublicSEOSettings);

// Get all SEO settings (for page management)
router.get('/', authenticateToken, requireRole('admin'), requirePermission(['view_settings', 'manage_settings']), getAllSEOSettings);

// Get SEO settings for a specific page
router.get('/:page', authenticateToken, requireRole('admin'), requirePermission(['view_settings', 'manage_settings']), getSEOSettings);

// Update SEO settings for a specific page (with optional image upload)
router.put('/:page',
    authenticateToken,
    requireRole('admin'),
    requirePermission('manage_settings'),
    upload.single('ogImage'),
    updateSEOSettings
);

module.exports = router;
