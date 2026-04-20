const express = require('express');
const router = express.Router();
const roleController = require('../controllers/roleController');
const { authenticateToken, requireAdminRole, requirePermission } = require('../middleware/auth');

// All role routes require authentication and admin role
router.use(authenticateToken, requireAdminRole);

// Get available permissions (requires view_roles or manage_settings)
router.get('/permissions', requirePermission(['view_roles', 'edit_roles', 'manage_settings']), roleController.getPermissions);

// Role CRUD operations
router.get('/', requirePermission(['view_roles', 'edit_roles', 'manage_settings']), roleController.getRoles);
router.post('/', requirePermission(['create_roles', 'manage_settings']), roleController.createRole);
router.put('/:id', requirePermission(['edit_roles', 'manage_settings']), roleController.updateRole);
router.delete('/:id', requirePermission(['delete_roles', 'manage_settings']), roleController.deleteRole);

module.exports = router;
