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
router.get('/', requireRole('admin'), requirePermission('settings:view'), getHubs);
router.get('/:id', requireRole('admin'), requirePermission('settings:view'), getHubById);
router.post('/', requireRole('admin'), requirePermission('settings:edit'), createHub);
router.put('/:id', requireRole('admin'), requirePermission('settings:edit'), updateHub);
router.patch('/:id/toggle-status', requireRole('admin'), requirePermission('settings:edit'), toggleHubStatus);
router.delete('/:id', requireRole('admin'), requirePermission('settings:edit'), deleteHub);

module.exports = router;
