const express = require('express');
const router = express.Router();
const {
    getAllSettlements,
    getSettlementById,
    updateSettlementStatus,
    getVendorSettlements
} = require('../controllers/settlementController');

const { authenticateToken, requireAdminRole, requireVendorRole } = require('../middleware/auth');

// Apply authentication middleware
router.use(authenticateToken);

// Admin Routes
router.get('/admin', requireAdminRole, getAllSettlements);
router.get('/admin/:id', requireAdminRole, getSettlementById);
router.put('/admin/:id/status', requireAdminRole, updateSettlementStatus);

// Vendor Routes
router.get('/vendor', requireVendorRole, getVendorSettlements);

module.exports = router;
