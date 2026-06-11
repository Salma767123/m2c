const express = require('express');
const { getVendorDashboardStats, getVendorDashboardChart } = require('../controllers/vendorDashboardController');
const { authenticateToken, requireRole, requireVendorRole } = require('../middleware/auth');

const router = express.Router();

// Get vendor dashboard stats
router.get('/stats', authenticateToken, requireVendorRole, getVendorDashboardStats);

// Get vendor dashboard trend chart data (revenue + orders) for a date range
router.get('/chart', authenticateToken, requireVendorRole, getVendorDashboardChart);

module.exports = router;
