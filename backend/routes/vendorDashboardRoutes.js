const express = require('express');
const { getVendorDashboardStats } = require('../controllers/vendorDashboardController');
const { authenticateToken, requireRole, requireVendorRole } = require('../middleware/auth');

const router = express.Router();

// Get vendor dashboard stats
router.get('/stats', authenticateToken, requireVendorRole, getVendorDashboardStats);

module.exports = router;
