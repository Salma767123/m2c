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
    getQcFactoryReports,
    getQcProductReports,
} = require('../controllers/reportsController');
const { authenticateToken, requireAdminRole, requirePermission } = require('../middleware/auth');

router.use(authenticateToken);
router.use(requireAdminRole);
router.use(requirePermission('view_reports'));

router.get('/overview', getOverviewReport);
router.get('/sales', getSalesReport);
router.get('/orders', getOrdersReport);
router.get('/settlement', getSettlementReport);
router.get('/vendors', getVendorsReport);
router.get('/products', getProductsReport);
router.get('/customers', getCustomersReport);
router.get('/financial', getFinancialReport);
router.get('/qc-factory', getQcFactoryReports);
router.get('/qc-products', getQcProductReports);

module.exports = router;
