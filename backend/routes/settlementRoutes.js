const express = require('express');
const router = express.Router();
const {
    getAllSettlements,
    getSettlementById,
    updateSettlementStatus,
    updateSettlementDueDate,
    getVendorSettlements
} = require('../controllers/settlementController');

const { authenticateToken, requireAdminRole, requireVendorRole, requirePermission } = require('../middleware/auth');

// Apply authentication middleware
router.use(authenticateToken);

// Admin Routes — settlements are part of the Billing module
router.get('/admin', requireAdminRole, requirePermission('settlement:view'), getAllSettlements);
router.get('/admin/:id', requireAdminRole, requirePermission('settlement:view'), getSettlementById);
router.put('/admin/:id/status', requireAdminRole, requirePermission('settlement:edit'), updateSettlementStatus);
router.put('/admin/:id/due-date', requireAdminRole, requirePermission('settlement:edit'), updateSettlementDueDate);

// Vendor Routes
router.get('/vendor', requireVendorRole, getVendorSettlements);

module.exports = router;
