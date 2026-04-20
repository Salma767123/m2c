const express = require('express');
const router = express.Router();
const {
    getHubs,
    getHubById,
    createHub,
    updateHub,
    deleteHub,
    toggleHubStatus
} = require('../controllers/hubController');
const { authenticateToken, requireRole, requirePermission } = require('../middleware/auth');

// All routes require authentication
router.use(authenticateToken);

// Hubs are infrastructure / settings
router.get('/', requireRole('admin'), requirePermission(['view_settings', 'manage_settings']), getHubs);
router.get('/:id', requireRole('admin'), requirePermission(['view_settings', 'manage_settings']), getHubById);
router.post('/', requireRole('admin'), requirePermission('manage_settings'), createHub);
router.put('/:id', requireRole('admin'), requirePermission('manage_settings'), updateHub);
router.patch('/:id/toggle-status', requireRole('admin'), requirePermission('manage_settings'), toggleHubStatus);
router.delete('/:id', requireRole('admin'), requirePermission('manage_settings'), deleteHub);

module.exports = router;
