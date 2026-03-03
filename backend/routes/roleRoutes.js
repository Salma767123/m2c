const express = require('express');
const router = express.Router();
const roleController = require('../controllers/roleController');
const { authenticateToken, requireAdminRole, requirePermission } = require('../middleware/auth');

// All role routes require authentication and admin role
router.use(authenticateToken, requireAdminRole);

// Get available permissions (requires view_settings or manage_settings)
router.get('/permissions', requirePermission(['view_settings', 'manage_settings']), roleController.getPermissions);

// Role CRUD operations
router.get('/', requirePermission(['view_settings', 'manage_settings']), roleController.getRoles);
router.post('/', requirePermission('manage_settings'), roleController.createRole);
router.put('/:id', requirePermission('manage_settings'), roleController.updateRole);
router.delete('/:id', requirePermission('manage_settings'), roleController.deleteRole);

module.exports = router;
