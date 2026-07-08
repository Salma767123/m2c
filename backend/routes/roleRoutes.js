const express = require('express');
const router = express.Router();
const roleController = require('../controllers/roleController');
const { authenticateToken, requireAdminRole, requirePermission } = require('../middleware/auth');

// All role routes require authentication and admin role
router.use(authenticateToken, requireAdminRole);

// Get available permissions (requires roles_permissions:view)
router.get('/permissions', requirePermission('roles_permissions:view'), roleController.getPermissions);

// Role CRUD operations
// staff_management:view is accepted too — the staff create/edit form needs the
// role list for its role dropdown.
router.get('/', requirePermission(['roles_permissions:view', 'staff_management:view']), roleController.getRoles);
router.post('/', requirePermission('roles_permissions:create'), roleController.createRole);
router.put('/:id', requirePermission('roles_permissions:edit'), roleController.updateRole);
router.delete('/:id', requirePermission('roles_permissions:delete'), roleController.deleteRole);

module.exports = router;
