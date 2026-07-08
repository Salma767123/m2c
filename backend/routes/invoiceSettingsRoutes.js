const express = require('express');
const {
    getInvoiceSettings,
    updateInvoiceSettings,
} = require('../controllers/invoiceSettingsController');
const { authenticateToken, requireAdminRole, requirePermission } = require('../middleware/auth');

const router = express.Router();

// Admin Routes for Invoice Settings
router.get('/', authenticateToken, requireAdminRole, requirePermission('settings:view'), getInvoiceSettings);
router.put('/', authenticateToken, requireAdminRole, requirePermission('settings:edit'), updateInvoiceSettings);

module.exports = router;
