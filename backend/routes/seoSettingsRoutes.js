const express = require('express');
const router = express.Router();
const { getSEOSettings, updateSEOSettings } = require('../controllers/seoSettingsController');
const { authenticateToken, requireRole } = require('../middleware/auth');

// Get SEO settings
router.get('/', authenticateToken, requireRole(['super_admin', 'admin', 'ADMIN', 'Super Admin']), getSEOSettings);

// Update SEO settings
router.put('/', authenticateToken, requireRole(['super_admin', 'ADMIN', 'Super Admin']), updateSEOSettings);

module.exports = router;
