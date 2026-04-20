const express = require('express');
const router = express.Router();
const {
    getAllSettlements,
    getSettlementById,
    updateSettlementStatus,
    getVendorSettlements
} = require('../controllers/settlementController');

const { authenticateToken, requireAdminRole, requireVendorRole, requirePermission } = require('../middleware/auth');

// Apply authentication middleware
router.use(authenticateToken);

// Admin Routes — settlements are part of the Billing module
router.get('/admin', requireAdminRole, requirePermission(['view_billing', 'manage_billing']), getAllSettlements);
router.get('/admin/:id', requireAdminRole, requirePermission(['view_billing', 'manage_billing']), getSettlementById);
router.put('/admin/:id/status', requireAdminRole, requirePermission('manage_billing'), updateSettlementStatus);

// Vendor Routes
router.get('/vendor', requireVendorRole, getVendorSettlements);

module.exports = router;
