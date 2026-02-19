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
const { authenticateToken, requireRole } = require('../middleware/auth');

// All routes require authentication
router.use(authenticateToken);

// Get all hubs - accessible by admins
router.get('/', requireRole(['admin', 'super_admin']), getHubs);

// Get single hub - accessible by admins
router.get('/:id', requireRole(['admin', 'super_admin']), getHubById);

// Create hub - accessible by admins
router.post('/', requireRole(['admin', 'super_admin']), createHub);

// Update hub - accessible by admins
router.put('/:id', requireRole(['admin', 'super_admin']), updateHub);

// Toggle hub active status - accessible by admins
router.patch('/:id/toggle-status', requireRole(['admin', 'super_admin']), toggleHubStatus);

// Delete hub - accessible by admins
router.delete('/:id', requireRole(['admin', 'super_admin']), deleteHub);

module.exports = router;
