const express = require('express');
const router = express.Router();
const {
    getOverviewReport,
    getSalesReport,
    getOrdersReport,
    getSettlementReport,
    getVendorsReport,
    getProductsReport,
    getCustomersReport,
    getFinancialReport,
} = require('../controllers/reportsController');
const { authenticateToken, requireAdminRole } = require('../middleware/auth');

router.use(authenticateToken);
router.use(requireAdminRole);

router.get('/overview', getOverviewReport);
router.get('/sales', getSalesReport);
router.get('/orders', getOrdersReport);
router.get('/settlement', getSettlementReport);
router.get('/vendors', getVendorsReport);
router.get('/products', getProductsReport);
router.get('/customers', getCustomersReport);
router.get('/financial', getFinancialReport);

module.exports = router;
