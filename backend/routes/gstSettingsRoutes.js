const express = require('express');
const router = express.Router();
const {
    getGSTSettings,
    createGSTSetting,
    updateGSTSetting,
    deleteGSTSetting
} = require('../controllers/gstSettingsController');
const { authenticateToken, requireRole } = require('../middleware/auth');

// All routes require authentication
router.use(authenticateToken);

// Get GST settings - accessible by admins
router.get('/', requireRole(['admin', 'super_admin']), getGSTSettings);

// Create GST setting - accessible by admins
router.post('/', requireRole(['admin', 'super_admin']), createGSTSetting);

// Update GST setting - accessible by admins
router.put('/:id', requireRole(['admin', 'super_admin']), updateGSTSetting);

// Delete GST setting - accessible by admins
router.delete('/:id', requireRole(['admin', 'super_admin']), deleteGSTSetting);

module.exports = router;
