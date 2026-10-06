const express = require('express');
const router = express.Router();
const {
    getMyPoints,
    getPublicSettings,
    getSettings,
    updateSettings,
    getAllAccounts,
    getAccountByCustomer,
    adjustAccount,
} = require('../controllers/creditPointsController');
const { authenticateToken, requireAdminRole, requirePermission } = require('../middleware/auth');

router.use(authenticateToken);

// Customer
router.get('/mine', getMyPoints);
router.get('/settings/public', getPublicSettings);

// Admin — settings (part of the Settings module)
router.get('/admin/settings', requireAdminRole, requirePermission('settings:view'), getSettings);
router.put('/admin/settings', requireAdminRole, requirePermission('settings:edit'), updateSettings);

// Admin — customer points accounts
router.get('/admin', requireAdminRole, requirePermission('points:view'), getAllAccounts);
router.get('/admin/:customerId', requireAdminRole, requirePermission('points:view'), getAccountByCustomer);
router.post('/admin/:customerId/adjust', requireAdminRole, requirePermission('points:adjust'), adjustAccount);

module.exports = router;
