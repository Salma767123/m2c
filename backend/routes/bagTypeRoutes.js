const express = require('express');
const {
    getActiveBagTypes,
    getBagTypes,
    getBagType,
    createBagType,
    updateBagType,
    deleteBagType,
    reorderBagTypes,
} = require('../controllers/bagTypeController');
const { authenticateToken, requireAdminRole, requirePermission } = require('../middleware/auth');

const router = express.Router();

// Public route — active bag types for cart page (no auth required)
router.get('/active', getActiveBagTypes);

// Admin routes
router.post('/', authenticateToken, requireAdminRole, requirePermission('bag_types:create'), createBagType);
router.get('/', authenticateToken, requireAdminRole, requirePermission('bag_types:view'), getBagTypes);
router.patch('/reorder', authenticateToken, requireAdminRole, requirePermission('bag_types:edit'), reorderBagTypes);
router.get('/:id', authenticateToken, requireAdminRole, requirePermission('bag_types:view'), getBagType);
router.put('/:id', authenticateToken, requireAdminRole, requirePermission('bag_types:edit'), updateBagType);
router.delete('/:id', authenticateToken, requireAdminRole, requirePermission('bag_types:delete'), deleteBagType);

module.exports = router;
