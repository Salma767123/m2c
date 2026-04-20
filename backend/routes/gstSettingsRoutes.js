const express = require('express');
const router = express.Router();
const {
    getGSTSettings,
    createGSTSetting,
    updateGSTSetting,
    deleteGSTSetting
} = require('../controllers/gstSettingsController');
const { authenticateToken, requireRole, requirePermission } = require('../middleware/auth');

// All routes require authentication
router.use(authenticateToken);

// Get GST settings - accessible by admins (any) and vendors (need it for product creation)
router.get('/', requireRole(['admin', 'vendor']), getGSTSettings);

// Mutating endpoints — admins with manage_settings only
router.post('/', requireRole('admin'), requirePermission('manage_settings'), createGSTSetting);
router.put('/:id', requireRole('admin'), requirePermission('manage_settings'), updateGSTSetting);
router.delete('/:id', requireRole('admin'), requirePermission('manage_settings'), deleteGSTSetting);

module.exports = router;
