const express = require('express');
const router = express.Router();
const { getVendorOverviewReport, getVendorOrdersReport } = require('../controllers/vendorReportsController');
const { authenticateToken, requireVendorRole } = require('../middleware/auth');

// Protect all vendor report routes
router.use(authenticateToken);
router.use(requireVendorRole);

router.get('/overview', getVendorOverviewReport);
router.get('/orders', getVendorOrdersReport);

// You can add more like /sales, /products here later if needed

module.exports = router;
