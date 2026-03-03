const express = require('express');
const {
    getInvoiceSettings,
    updateInvoiceSettings,
} = require('../controllers/invoiceSettingsController');
const { authenticateToken, requireAdminRole } = require('../middleware/auth');

const router = express.Router();

// Admin Routes for Invoice Settings
router.get('/', authenticateToken, requireAdminRole, getInvoiceSettings);
router.put('/', authenticateToken, requireAdminRole, updateInvoiceSettings);

module.exports = router;
