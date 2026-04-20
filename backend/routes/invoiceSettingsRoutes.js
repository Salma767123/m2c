const express = require('express');
const {
    getInvoiceSettings,
    updateInvoiceSettings,
} = require('../controllers/invoiceSettingsController');
const { authenticateToken, requireAdminRole, requirePermission } = require('../middleware/auth');

const router = express.Router();

// Admin Routes for Invoice Settings
router.get('/', authenticateToken, requireAdminRole, requirePermission(['view_billing', 'manage_billing']), getInvoiceSettings);
router.put('/', authenticateToken, requireAdminRole, requirePermission('manage_billing'), updateInvoiceSettings);

module.exports = router;
