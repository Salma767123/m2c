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
const { authenticateToken, requireAdminRole } = require('../middleware/auth');

const router = express.Router();

// Public route — active bag types for cart page (no auth required)
router.get('/active', getActiveBagTypes);

// Admin routes
router.post('/', authenticateToken, requireAdminRole, createBagType);
router.get('/', authenticateToken, requireAdminRole, getBagTypes);
router.patch('/reorder', authenticateToken, requireAdminRole, reorderBagTypes);
router.get('/:id', authenticateToken, requireAdminRole, getBagType);
router.put('/:id', authenticateToken, requireAdminRole, updateBagType);
router.delete('/:id', authenticateToken, requireAdminRole, deleteBagType);

module.exports = router;
